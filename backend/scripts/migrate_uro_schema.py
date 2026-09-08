import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "prahari.db")

def run_migration():
    if not os.path.exists(DB_PATH):
        print(f"[Migration] Database {DB_PATH} does not exist yet. Skipping.")
        return

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Check personnel columns
    c.execute("PRAGMA table_info(personnel)")
    cols_p = [row[1] for row in c.fetchall()]
    if "trade" not in cols_p:
        print("[Migration] Adding 'trade' column to personnel table...")
        c.execute("ALTER TABLE personnel ADD COLUMN trade VARCHAR(50) DEFAULT 'GD'")

    # Check uro_runs columns
    c.execute("PRAGMA table_info(uro_runs)")
    cols_u = [row[1] for row in c.fetchall()]
    columns_to_add = [
        ("commander_approved", "BOOLEAN DEFAULT 0"),
        ("commander_approved_at", "DATETIME"),
        ("commander_user_id", "VARCHAR(36)"),
        ("welfare_approved", "BOOLEAN DEFAULT 0"),
        ("welfare_approved_at", "DATETIME"),
        ("welfare_user_id", "VARCHAR(36)"),
        ("roster_committed", "BOOLEAN DEFAULT 0"),
    ]

    for col_name, col_def in columns_to_add:
        if col_name not in cols_u:
            print(f"[Migration] Adding '{col_name}' column to uro_runs table...")
            c.execute(f"ALTER TABLE uro_runs ADD COLUMN {col_name} {col_def}")

    conn.commit()
    conn.close()
    print("[Migration] SQLite schema migration finished successfully.")

if __name__ == "__main__":
    run_migration()
