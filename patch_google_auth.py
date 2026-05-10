content = open('backend/app/auth/google_auth.py', encoding='utf-8').read()

sql = (
    "INSERT INTO forum_users (username, email, hashed_password, display_name, governorate) "
    "VALUES (%s, %s, %s, %s, %s) "
    "ON CONFLICT (email) DO UPDATE SET "
    "display_name = COALESCE(EXCLUDED.display_name, forum_users.display_name), "
    "governorate  = COALESCE(EXCLUDED.governorate,  forum_users.governorate), "
    "updated_at   = NOW()"
)

helper = (
    "\nimport secrets\n"
    "from passlib.context import CryptContext\n"
    "_pwd_ctx = CryptContext(schemes=['bcrypt'], deprecated='auto')\n\n"
    "def _ensure_forum_user(cur, email, name, governorate=None):\n"
    "    username = email.split('@')[0].lower().replace('.','_').replace('+','_')[:50]\n"
    "    cur.execute('SELECT id FROM forum_users WHERE username = %s AND email != %s', (username, email))\n"
    "    if cur.fetchone():\n"
    "        import secrets as _s\n"
    "        username = username[:45] + '_' + _s.token_hex(2)\n"
    "    random_pw = _pwd_ctx.hash(secrets.token_hex(16))\n"
    "    cur.execute('" + sql + "', (username, email, random_pw, name or username, governorate))\n\n"
)

content = content.replace(
    'def get_db():\n    return psycopg2.connect(DATABASE_URL)',
    'def get_db():\n    return psycopg2.connect(DATABASE_URL)\n' + helper
)

content = content.replace(
    '        row = cur.fetchone()\n        conn.commit()\n        cur.close()\n        conn.close()\n        return {\n            "id": row[0], "email": row[1], "name": row[2],\n            "picture": row[3], "governorate": row[4],\n            "user_type": row[5], "google_id": row[6]\n        }',
    '        row = cur.fetchone()\n        _ensure_forum_user(cur, row[1], row[2], row[4])\n        conn.commit()\n        cur.close()\n        conn.close()\n        return {\n            "id": row[0], "email": row[1], "name": row[2],\n            "picture": row[3], "governorate": row[4],\n            "user_type": row[5], "google_id": row[6]\n        }'
)

content = content.replace(
    '        row = cur.fetchone()\n        conn.commit()\n        cur.close()\n        conn.close()\n        return {"id": row[0], "email": row[1], "name": row[2], "governorate": row[3], "user_type": row[4]}',
    '        row = cur.fetchone()\n        _ensure_forum_user(cur, row[1], row[2], row[3])\n        conn.commit()\n        cur.close()\n        conn.close()\n        return {"id": row[0], "email": row[1], "name": row[2], "governorate": row[3], "user_type": row[4]}'
)

content = content.replace(
    '        if not row:\n            raise HTTPException(status_code=401, detail="Invalid email or password.")',
    '        if not row:\n            cur.close()\n            conn.close()\n            raise HTTPException(status_code=401, detail="Invalid email or password.")'
)

content = content.replace(
    '        return {"id": row[0], "email": row[1], "name": row[2], "governorate": row[3], "user_type": row[4], "picture": row[5]}',
    '        _ensure_forum_user(cur, row[1], row[2], row[3])\n        conn.commit()\n        cur.close()\n        conn.close()\n        return {"id": row[0], "email": row[1], "name": row[2], "governorate": row[3], "user_type": row[4], "picture": row[5]}'
)

open('backend/app/auth/google_auth.py', 'w', encoding='utf-8').write(content)
print('Done')
