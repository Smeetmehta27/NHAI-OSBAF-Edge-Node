import sqlite3

conn = sqlite3.connect("face_auth.db")

rows = conn.execute(
    "SELECT user_id, name FROM users"
).fetchall()

for row in rows:
    print(row)

conn.close()