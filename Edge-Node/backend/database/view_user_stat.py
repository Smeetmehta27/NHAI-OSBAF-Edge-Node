import sqlite3

conn = sqlite3.connect("face_auth.db")

rows = conn.execute("""
SELECT
    user_id,
    name,
    authentication_count,
    last_authenticated
FROM users
""").fetchall()

for row in rows:
    print(row)

conn.close()