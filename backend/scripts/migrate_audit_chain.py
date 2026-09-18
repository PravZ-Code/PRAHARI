import sqlite3
import json
import hashlib
import os

def migrate_db(db_path: str):
    if not os.path.exists(db_path):
        print(f"Skipping {db_path} (not found)")
        return
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cols = [r[1] for r in cur.execute("PRAGMA table_info(audit_log)").fetchall()]
    zero_hash = "0" * 64
    if "sequence_number" not in cols:
        cur.execute("ALTER TABLE audit_log ADD COLUMN sequence_number INTEGER")
    if "previous_hash" not in cols:
        cur.execute(f"ALTER TABLE audit_log ADD COLUMN previous_hash VARCHAR(64) NOT NULL DEFAULT '{zero_hash}'")
    if "current_hash" not in cols:
        cur.execute(f"ALTER TABLE audit_log ADD COLUMN current_hash VARCHAR(64) NOT NULL DEFAULT '{zero_hash}'")
    conn.commit()

    rows = cur.execute("SELECT id, user_id, action, resource_type, resource_id, endpoint, timestamp, details FROM audit_log ORDER BY timestamp ASC").fetchall()
    prev_hash = zero_hash
    seq = 1
    for row in rows:
        row_id, user_id, action, res_type, res_id, endpoint, ts, details = row
        res_id_str = res_id if res_id else ""
        if isinstance(details, str):
            try:
                details_obj = json.loads(details)
            except Exception:
                details_obj = {}
        elif isinstance(details, dict):
            details_obj = details
        else:
            details_obj = {}
        details_json = json.dumps(details_obj, sort_keys=True)
        # SQLite timestamps might be "2026-09-06 07:28:26.848227"
        ts_iso = ts.replace(" ", "T") if ts else ""
        payload = f"{prev_hash}|{user_id}|{action}|{res_type}|{res_id_str}|{endpoint}|{ts_iso}|{details_json}"
        curr_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()
        cur.execute("UPDATE audit_log SET sequence_number=?, previous_hash=?, current_hash=? WHERE id=?", (seq, prev_hash, curr_hash, row_id))
        prev_hash = curr_hash
        seq += 1
    conn.commit()
    conn.close()
    print(f"Migrated {db_path}, {len(rows)} rows backfilled.")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    migrate_db(os.path.join(base_dir, "prahari.db"))
    migrate_db(os.path.join(base_dir, "saathi.db"))
