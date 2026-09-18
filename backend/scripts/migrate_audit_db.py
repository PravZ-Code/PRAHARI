import sqlite3
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def migrate(db_path):
    if not os.path.exists(db_path):
        print(f"Skipping {db_path}, file does not exist.")
        return
    print(f"Migrating {db_path}...")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(audit_log)")
    cols = [c[1] for c in cur.fetchall()]
    print(f"Existing columns in {db_path}: {cols}")
    
    if "signature" not in cols:
        cur.execute("ALTER TABLE audit_log ADD COLUMN signature VARCHAR(128)")
        print(f"Added signature column to {db_path}")
    if "anchor_id" not in cols:
        cur.execute("ALTER TABLE audit_log ADD COLUMN anchor_id VARCHAR(36)")
        print(f"Added anchor_id column to {db_path}")

    cur.execute("""
    CREATE TABLE IF NOT EXISTS audit_anchor (
        id VARCHAR(36) PRIMARY KEY,
        block_height INTEGER NOT NULL,
        head_block_hash VARCHAR(64) NOT NULL,
        merkle_root VARCHAR(64) NOT NULL,
        signature VARCHAR(128) NOT NULL,
        external_receipt_nonce VARCHAR(64) NOT NULL,
        anchored_at DATETIME NOT NULL
    )
    """)
    cur.execute("SELECT id, current_hash FROM audit_log")
    all_rows = cur.fetchall()
    if all_rows:
        from middleware.audit import sign_audit_hash
        for rid, chash in all_rows:
            if chash:
                sig = sign_audit_hash(chash)
                cur.execute("UPDATE audit_log SET signature = ? WHERE id = ?", (sig, rid))
        print(f"Updated signatures for {len(all_rows)} records in {db_path}")

    print(f"Ensured audit_anchor table in {db_path}")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    db_paths = [
        os.path.join(os.path.dirname(__file__), "..", "prahari.db"),
        os.path.join(os.path.dirname(__file__), "..", "..", "backend", "prahari.db")
    ]
    for p in db_paths:
        migrate(os.path.abspath(p))
