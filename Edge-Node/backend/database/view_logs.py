import sqlite3

conn = sqlite3.connect("face_auth.db")

rows = conn.execute("""
SELECT *
FROM auth_logs
ORDER BY timestamp DESC
""").fetchall()

for row in rows:
    print(row)

conn.close()