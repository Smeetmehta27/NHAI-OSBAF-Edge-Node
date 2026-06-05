import sqlite3

DB_NAME = "face_auth.db"

def log_authentication(user_id, confidence):

    conn = sqlite3.connect(DB_NAME)

    conn.execute("""
    INSERT INTO auth_logs(
        user_id,
        confidence,
        sync_status
    )
    VALUES (?, ?, ?)
    """,
    (
        user_id,
        confidence,
        "PENDING"
    ))

    conn.execute("""
    UPDATE users
    SET
        last_authenticated = CURRENT_TIMESTAMP,
        authentication_count =
            COALESCE(authentication_count,0) + 1
    WHERE user_id = ?
    """,
    (user_id,))

    conn.commit()
    conn.close()