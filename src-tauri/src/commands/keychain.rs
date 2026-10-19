#[cfg(not(windows))]
use std::collections::HashMap;
#[cfg(not(windows))]
use std::sync::Mutex;

#[cfg(not(windows))]
static IN_MEMORY_STORE: Mutex<Option<HashMap<String, String>>> = Mutex::new(None);

#[cfg(windows)]
#[repr(C)]
#[allow(non_snake_case)]
#[allow(clippy::upper_case_acronyms)]
struct CREDENTIALW {
    Flags: u32,
    Type: u32,
    TargetName: *mut u16,
    Comment: *mut u16,
    LastWritten: u64,
    CredentialBlobSize: u32,
    CredentialBlob: *mut u8,
    Persist: u32,
    AttributeCount: u32,
    Attributes: *mut std::ffi::c_void,
    TargetAlias: *mut u16,
    UserName: *mut u16,
}

#[cfg(windows)]
const CRED_TYPE_GENERIC: u32 = 1;
#[cfg(windows)]
const CRED_PERSIST_LOCAL_MACHINE: u32 = 2;

#[cfg(windows)]
#[link(name = "advapi32")]
extern "system" {
    fn CredWriteW(credential: *const CREDENTIALW, flags: u32) -> i32;
    fn CredReadW(
        target_name: *const u16,
        type_: u32,
        flags: u32,
        credential: *mut *mut CREDENTIALW,
    ) -> i32;
    fn CredDeleteW(target_name: *const u16, type_: u32, flags: u32) -> i32;
    fn CredFree(buffer: *mut std::ffi::c_void);
}

#[cfg(windows)]
fn to_wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

/// Checks whether the native OS secure credential store is operational.
/// On Windows, returns true (backed by Windows Credential Manager).
/// On Linux/macOS without a native daemon configured, returns false to signal
/// the frontend to display the OP-SEC-002 fallback notification and store in-memory.
#[tauri::command]
pub fn is_keychain_available() -> bool {
    #[cfg(windows)]
    {
        true
    }
    #[cfg(not(windows))]
    {
        false
    }
}

/// Stores a sensitive secret in the OS secure credential store or in-memory fallback.
#[tauri::command]
pub fn store_keychain_secret(key: String, secret: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        let target = format!("openpost:{}", key);
        let mut target_wide = to_wide(&target);
        let mut user_wide = to_wide("OpenPostUser");
        let secret_bytes = secret.as_bytes();

        let cred = CREDENTIALW {
            Flags: 0,
            Type: CRED_TYPE_GENERIC,
            TargetName: target_wide.as_mut_ptr(),
            Comment: std::ptr::null_mut(),
            LastWritten: 0,
            CredentialBlobSize: secret_bytes.len() as u32,
            CredentialBlob: secret_bytes.as_ptr() as *mut u8,
            Persist: CRED_PERSIST_LOCAL_MACHINE,
            AttributeCount: 0,
            Attributes: std::ptr::null_mut(),
            TargetAlias: std::ptr::null_mut(),
            UserName: user_wide.as_mut_ptr(),
        };

        // SAFETY: `cred` points to stack-allocated wide strings and byte slice
        // with accurate length buffers that live for the duration of the FFI call.
        let res = unsafe { CredWriteW(&cred, 0) };
        if res == 0 {
            let err = std::io::Error::last_os_error();
            return Err(format!("Windows CredWrite failed: {}", err));
        }
        Ok(())
    }

    #[cfg(not(windows))]
    {
        let mut guard = IN_MEMORY_STORE.lock().map_err(|e| e.to_string())?;
        if guard.is_none() {
            *guard = Some(HashMap::new());
        }
        guard.as_mut().unwrap().insert(key, secret);
        Ok(())
    }
}

/// Retrieves a sensitive secret by key from the OS secure store or in-memory fallback.
#[tauri::command]
pub fn get_keychain_secret(key: String) -> Result<Option<String>, String> {
    #[cfg(windows)]
    {
        let target = format!("openpost:{}", key);
        let target_wide = to_wide(&target);
        let mut cred_ptr: *mut CREDENTIALW = std::ptr::null_mut();

        // SAFETY: `target_wide` is a valid null-terminated UTF-16 slice.
        // `cred_ptr` is an out-pointer initialized to null.
        let res = unsafe { CredReadW(target_wide.as_ptr(), CRED_TYPE_GENERIC, 0, &mut cred_ptr) };
        if res == 0 || cred_ptr.is_null() {
            return Ok(None);
        }

        // SAFETY: `cred_ptr` was validated non-null and allocated by CredReadW.
        let secret = unsafe {
            let cred = &*cred_ptr;
            let blob_slice =
                std::slice::from_raw_parts(cred.CredentialBlob, cred.CredentialBlobSize as usize);
            String::from_utf8_lossy(blob_slice).to_string()
        };

        // SAFETY: `cred_ptr` was allocated by the Win32 API and must be freed with CredFree.
        unsafe {
            CredFree(cred_ptr as *mut std::ffi::c_void);
        }

        Ok(Some(secret))
    }

    #[cfg(not(windows))]
    {
        let guard = IN_MEMORY_STORE.lock().map_err(|e| e.to_string())?;
        if let Some(ref map) = *guard {
            Ok(map.get(&key).cloned())
        } else {
            Ok(None)
        }
    }
}

/// Deletes a secret from the OS secure store or in-memory fallback.
#[tauri::command]
pub fn delete_keychain_secret(key: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        let target = format!("openpost:{}", key);
        let target_wide = to_wide(&target);
        // SAFETY: `target_wide` is a valid null-terminated UTF-16 slice.
        let _ = unsafe { CredDeleteW(target_wide.as_ptr(), CRED_TYPE_GENERIC, 0) };
        Ok(())
    }

    #[cfg(not(windows))]
    {
        let mut guard = IN_MEMORY_STORE.lock().map_err(|e| e.to_string())?;
        if let Some(ref mut map) = *guard {
            map.remove(&key);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keychain_availability() {
        let available = is_keychain_available();
        #[cfg(windows)]
        assert!(available, "Keychain must be available on Windows");
        #[cfg(not(windows))]
        assert!(
            !available,
            "Non-Windows targets without daemon must report false to trigger OP-SEC-002 banner"
        );
    }

    #[test]
    fn test_keychain_roundtrip() {
        let test_key = "test_cred_roundtrip_key";
        let test_val = "secret_payload_value_998877";

        // Store
        store_keychain_secret(test_key.to_string(), test_val.to_string()).unwrap();

        // Retrieve
        let retrieved = get_keychain_secret(test_key.to_string()).unwrap();
        assert_eq!(retrieved, Some(test_val.to_string()));

        // Delete
        delete_keychain_secret(test_key.to_string()).unwrap();

        // Verify gone
        let after_del = get_keychain_secret(test_key.to_string()).unwrap();
        assert_eq!(after_del, None);
    }
}
