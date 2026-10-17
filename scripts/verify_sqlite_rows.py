import sqlite3
import json
import sys
import os

print("=" * 80)
print("OPENPOST RAW SQLITE DATABASE VERIFICATION & AUDIT REPORT")
print("=" * 80)

# Check 1: DB1 - Rolling Prune Limit of 100
db1_path = os.path.join("src-tauri", "test_history_redaction.db")
print(f"\n[Test 1] Inspecting DB1: {db1_path} (Rolling Prune Verification)")
conn1 = sqlite3.connect(db1_path)
cur1 = conn1.cursor()
cur1.execute("SELECT COUNT(*) FROM request_history;")
count1 = cur1.fetchone()[0]
print(f"  -> Total records in request_history: {count1}")
assert count1 == 100, f"Expected exactly 100 records, got {count1}"

cur1.execute("SELECT id, timestamp, method, url FROM request_history ORDER BY timestamp DESC LIMIT 3;")
newest = cur1.fetchall()
print("  -> Newest 3 records in DB:")
for row in newest:
    print(f"     ID: {row[0]}, Timestamp: {row[1]}, Method: {row[2]}, URL: {row[3]}")

cur1.execute("SELECT id, timestamp, method, url FROM request_history ORDER BY timestamp ASC LIMIT 3;")
oldest = cur1.fetchall()
print("  -> Oldest 3 remaining records in DB:")
for row in oldest:
    print(f"     ID: {row[0]}, Timestamp: {row[1]}, Method: {row[2]}, URL: {row[3]}")

# Verify that req-prune-1 through req-prune-5 were pruned
cur1.execute("SELECT COUNT(*) FROM request_history WHERE id IN ('req-prune-1', 'req-prune-2', 'req-prune-3', 'req-prune-4', 'req-prune-5');")
pruned_count = cur1.fetchone()[0]
print(f"  -> Count of pruned records (req-prune-1..5): {pruned_count} (Must be 0)")
assert pruned_count == 0, "Oldest records were not pruned properly!"
conn1.close()
print("  [PASS] Rolling prune strictly enforces limit of 100.")

# Check 2: DB2 - Secret Redaction Verification in Raw Rows and File Bytes
db2_path = os.path.join("src-tauri", "test_secrets_stored.db")
print(f"\n[Test 2] Inspecting DB2: {db2_path} (Secret Redaction Verification)")

with open(db2_path, "rb") as f:
    raw_bytes = f.read()

forbidden_secrets = [
    b"confidential_bearer_token_xyz",
    b"confidential_session_cookie_abc",
    b"confidential_api_key_777",
    b"super_secret_jwt_token_9999",
    b"sk_live_1234567890abcdef",
    b"super_secret_password_never_log",
]

found_leaks = []
for s in forbidden_secrets:
    if s in raw_bytes:
        found_leaks.append(s.decode("utf-8", errors="ignore"))

if found_leaks:
    print(f"  [FAIL] Plaintext secrets detected in raw database file bytes: {found_leaks}")
    sys.exit(1)
else:
    print("  -> Raw SQLite file bytes scan: ZERO plaintext credentials detected.")

conn2 = sqlite3.connect(db2_path)
cur2 = conn2.cursor()
cur2.execute("SELECT id, method, url, headers_json, body FROM request_history WHERE id='req-with-credentials';")
secret_row = cur2.fetchone()

print("\n  -> Stored Row Columns in SQLite:")
print(f"     ID:           {secret_row[0]}")
print(f"     Method:       {secret_row[1]}")
print(f"     URL:          {secret_row[2]}")
print(f"     Headers JSON: {secret_row[3]}")
print(f"     Body:         {secret_row[4]}")

# Assertions on column contents
url_stored = secret_row[2]
headers_stored = json.loads(secret_row[3])
body_stored = json.loads(secret_row[4])

assert "token=[REDACTED]" in url_stored, "URL token param not redacted!"
assert "api_key=[REDACTED]" in url_stored, "URL api_key param not redacted!"
assert "safe_id=user_42" in url_stored, "Safe query param was incorrectly altered!"
assert "tpl={{vault_secret}}" in url_stored, "Unresolved template variable was not preserved!"

assert "[REDACTED]" in headers_stored["Authorization"], "Authorization header not redacted!"
assert headers_stored["Cookie"] == "[REDACTED]", "Cookie header not redacted!"
assert headers_stored["X-API-Key"] == "[REDACTED]", "X-API-Key header not redacted!"
assert headers_stored["Accept"] == "application/json", "Safe header was altered!"

assert body_stored["password"] == "[REDACTED]", "JSON body password field not redacted!"
assert body_stored["username"] == "admin", "Safe body field altered!"

conn2.close()
print("\n  [PASS] All URL tokens, API keys, Authorization, Cookie, and JSON body passwords are [REDACTED].")
print("  [PASS] Unresolved {{template}} variables and non-secret fields are completely preserved.")
print("\n" + "=" * 80)
print("AUDIT SUMMARY: 100% OF SECURITY & RETENTION INVARIANTS VERIFIED.")
print("=" * 80)
