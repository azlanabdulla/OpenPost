#[cfg(not(windows))]
use std::collections::HashMap;
#[cfg(not(windows))]
use std::sync::Mutex;

#[cfg(not(windows))]
static IN_MEMORY_STORE: Mutex<Option<HashMap<String, String>>> = Mutex::new(None);

#[cfg(windows)]
#[repr(C)]
#[allow(non_snake_case)]
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

#[tauri::command]
pub fn is_keychain_available() -> bool {
    #[cfg(windows)]
    {
        true
    }
    #[cfg(not(windows))]
    {
        true
    }
}

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

        let res = unsafe { CredWriteW(&cred, 0) };
        if res == 0 {
            let err = std::io::Error::last_os_error();
            return Err(format!("Windows CredWrite failed: {}", err));
        }
        Ok(())
    }

    #[cfg(not(windows))]
    {
        let mut guard = IN_MEMORY_STORE.lock().unwrap();
        if guard.is_none() {
            *guard = Some(HashMap::new());
        }
        guard.as_mut().unwrap().insert(key, secret);
        Ok(())
    }
}

#[tauri::command]
pub fn get_keychain_secret(key: String) -> Result<Option<String>, String> {
    #[cfg(windows)]
    {
        let target = format!("openpost:{}", key);
        let target_wide = to_wide(&target);
        let mut cred_ptr: *mut CREDENTIALW = std::ptr::null_mut();

        let res = unsafe { CredReadW(target_wide.as_ptr(), CRED_TYPE_GENERIC, 0, &mut cred_ptr) };
        if res == 0 {
            return Ok(None);
        }

        if cred_ptr.is_null() {
            return Ok(None);
        }

        let cred = unsafe { &*cred_ptr };
        let blob_slice = unsafe {
            std::slice::from_raw_parts(cred.CredentialBlob, cred.CredentialBlobSize as usize)
        };
        let secret = String::from_utf8_lossy(blob_slice).to_string();

        unsafe {
            CredFree(cred_ptr as *mut std::ffi::c_void);
        }

        Ok(Some(secret))
    }

    #[cfg(not(windows))]
    {
        let guard = IN_MEMORY_STORE.lock().unwrap();
        if let Some(ref map) = *guard {
            Ok(map.get(&key).cloned())
        } else {
            Ok(None)
        }
    }
}

#[tauri::command]
pub fn delete_keychain_secret(key: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        let target = format!("openpost:{}", key);
        let target_wide = to_wide(&target);
        let res = unsafe { CredDeleteW(target_wide.as_ptr(), CRED_TYPE_GENERIC, 0) };
        // 0 with ERROR_NOT_FOUND is considered acceptable deletion
        let _ = res;
        Ok(())
    }

    #[cfg(not(windows))]
    {
        let mut guard = IN_MEMORY_STORE.lock().unwrap();
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
