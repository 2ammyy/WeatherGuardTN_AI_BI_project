content = open('backend/app/auth/google_auth.py', encoding='utf-8').read()

# Add jose import at top
content = content.replace(
    'import os\nimport psycopg2',
    'import os\nimport psycopg2\nfrom jose import jwt\nfrom datetime import timedelta, timezone'
)

# Add token generation helper
token_helper = (
    "\nFORUM_SECRET = os.getenv('FORUM_SECRET_KEY', 'change-me-in-production-use-long-random-string')\n\n"
    "def _make_forum_token(user_id: str) -> str:\n"
    "    payload = {'sub': str(user_id), 'type': 'access',\n"
    "               'exp': datetime.now(timezone.utc) + timedelta(hours=24)}\n"
    "    return jwt.encode(payload, FORUM_SECRET, algorithm='HS256')\n\n"
)

content = content.replace(
    "\ndef _ensure_forum_user",
    token_helper + "\ndef _ensure_forum_user"
)

# Return forum_token in google login response
content = content.replace(
    '        _ensure_forum_user(cur, row[1], row[2], row[4])\n        conn.commit()\n        cur.close()\n        conn.close()\n        return {\n            "id": row[0], "email": row[1], "name": row[2],\n            "picture": row[3], "governorate": row[4],\n            "user_type": row[5], "google_id": row[6]\n        }',
    '        _ensure_forum_user(cur, row[1], row[2], row[4])\n        cur.execute("SELECT id FROM forum_users WHERE email = %s", (row[1],))\n        frow = cur.fetchone()\n        conn.commit()\n        cur.close()\n        conn.close()\n        return {\n            "id": row[0], "email": row[1], "name": row[2],\n            "picture": row[3], "governorate": row[4],\n            "user_type": row[5], "google_id": row[6],\n            "forum_token": _make_forum_token(frow[0]) if frow else None\n        }'
)

# Return forum_token in email login response
content = content.replace(
    '        _ensure_forum_user(cur, row[1], row[2], row[3])\n        conn.commit()\n        cur.close()\n        conn.close()\n        return {"id": row[0], "email": row[1], "name": row[2], "governorate": row[3], "user_type": row[4], "picture": row[5]}',
    '        _ensure_forum_user(cur, row[1], row[2], row[3])\n        cur.execute("SELECT id FROM forum_users WHERE email = %s", (row[1],))\n        frow = cur.fetchone()\n        conn.commit()\n        cur.close()\n        conn.close()\n        return {"id": row[0], "email": row[1], "name": row[2], "governorate": row[3], "user_type": row[4], "picture": row[5], "forum_token": _make_forum_token(frow[0]) if frow else None}'
)

open('backend/app/auth/google_auth.py', 'w', encoding='utf-8').write(content)
print('Done')
