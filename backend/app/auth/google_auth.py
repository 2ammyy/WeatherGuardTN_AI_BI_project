from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os
import psycopg2
from jose import jwt
from datetime import timedelta, timezone
from datetime import datetime
from app.services.email_service import send_welcome_email, send_account_deleted

router = APIRouter()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "932539718184-1rrvuua9t4907c8nkirk8n18cglm17hk.apps.googleusercontent.com")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://weatheruser:weatherpass@db:5432/weatherguard")

def get_db():
    return psycopg2.connect(DATABASE_URL, connect_timeout=10, sslmode='require')

import traceback
import secrets
from passlib.context import CryptContext
_pwd_ctx = CryptContext(schemes=['bcrypt_sha256'], deprecated='auto')

FORUM_SECRET = os.getenv('FORUM_SECRET_KEY', 'change-me-in-production-use-long-random-string')

def _make_forum_token(user_id: str) -> str:
    payload = {'sub': str(user_id), 'type': 'access',
               'exp': datetime.now(timezone.utc) + timedelta(hours=24)}
    return jwt.encode(payload, FORUM_SECRET, algorithm='HS256')


def _ensure_forum_user(cur, email, name, governorate=None):
    username = email.split('@')[0].lower().replace('.','_').replace('+','_')[:50]
    cur.execute('SELECT id FROM forum_users WHERE username = %s AND email != %s', (username, email))
    if cur.fetchone():
        import secrets as _s
        username = username[:45] + '_' + _s.token_hex(2)
    random_pw = _pwd_ctx.hash(secrets.token_hex(16))
    cur.execute('INSERT INTO forum_users (username, email, hashed_password, display_name, governorate) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (email) DO UPDATE SET display_name = COALESCE(EXCLUDED.display_name, forum_users.display_name), governorate  = COALESCE(EXCLUDED.governorate,  forum_users.governorate), updated_at   = NOW()', (username, email, random_pw, name or username, governorate))



# ─── MODELS ───────────────────────────────────────────────────────────────────

class GoogleAuthRequest(BaseModel):
    token: str
    governorate: str = None
    user_type: str = None

class EmailAuthRequest(BaseModel):
    email: str
    password: str = None
    name: str = None
    governorate: str = None
    user_type: str = None

class UpdateRequest(BaseModel):
    email: str
    name: str = None
    governorate: str = None
    user_type: str = None

class DeleteRequest(BaseModel):
    email: str

# ─── GOOGLE AUTH ──────────────────────────────────────────────────────────────

@router.post("/google")
async def google_auth(request: GoogleAuthRequest):
    try:
        print(f"DEBUG: Received token (first 50 chars): {request.token[:50]}")
        print("DEBUG: Step 1 - Verifying token...")
        idinfo = id_token.verify_oauth2_token(
            request.token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10,
        )
        print(f"DEBUG: Step 2 - Token verified OK, email={idinfo.get('email')}")
        print("DEBUG: Step 3 - Connecting to database...")
        conn = get_db()
        print("DEBUG: Step 4 - Connected, creating cursor...")
        cur = conn.cursor()
        print("DEBUG: Step 5 - Executing INSERT...")
        cur.execute("""
            INSERT INTO users (google_id, email, name, picture, governorate, user_type, last_login)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (google_id) DO UPDATE SET
                last_login = %s,
                governorate = COALESCE(%s, users.governorate),
                user_type   = COALESCE(%s, users.user_type)
            RETURNING id, email, name, picture, governorate, user_type, google_id
        """, (
            idinfo["sub"], idinfo["email"], idinfo.get("name"),
            idinfo.get("picture"), request.governorate, request.user_type,
            datetime.now(),
            datetime.now(), request.governorate, request.user_type
        ))
        print("DEBUG: Step 6 - Fetching result...")
        row = cur.fetchone()
        print(f"DEBUG: Step 7 - User row: id={row[0] if row else None}")
        print("DEBUG: Step 8 - Ensuring forum user...")
        _ensure_forum_user(cur, row[1], row[2], row[4])
        print("DEBUG: Step 9 - Fetching forum user...")
        cur.execute("SELECT id FROM forum_users WHERE email = %s", (row[1],))
        frow = cur.fetchone()
        print("DEBUG: Step 10 - Committing...")
        conn.commit()
        print("DEBUG: Step 11 - Closing connection...")
        cur.close()
        conn.close()
        print("DEBUG: Step 12 - Sending welcome email...")
        send_welcome_email(row[1], row[2])
        print("DEBUG: Step 13 - Returning response...")
        return {
            "id": row[0], "email": row[1], "name": row[2],
            "picture": row[3], "governorate": row[4],
            "user_type": row[5], "google_id": row[6],
            "forum_token": _make_forum_token(frow[0]) if frow else None
        }
    except ValueError as e:
        print(f"CRITICAL AUTH ERROR: {str(e)}")
        import traceback as _tb
        print("TRACEBACK:", _tb.format_exc())
        return JSONResponse(status_code=401, content={"detail": f"Invalid Google token: {str(e)}"})
    except Exception as e:
        import traceback as _tb
        _tb.print_exc()
        print(f"AUTH 500 ERROR: {str(e)}")
        print("TRACEBACK:", _tb.format_exc())
        return JSONResponse(status_code=500, content={"detail": f"Auth error: {str(e)}"})

# ─── REGISTER ─────────────────────────────────────────────────────────────────

@router.post("/register")
async def register(request: EmailAuthRequest):
    try:
        import hashlib
        password_hash = hashlib.sha256(request.password.encode()).hexdigest()
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO users (email, name, password_hash, governorate, user_type)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, email, name, governorate, user_type
        """, (request.email, request.name, password_hash, request.governorate, request.user_type))
        row = cur.fetchone()
        _ensure_forum_user(cur, row[1], row[2], row[3])
        conn.commit()
        cur.close()
        conn.close()
        send_welcome_email(row[1], row[2])
        return {"id": row[0], "email": row[1], "name": row[2], "governorate": row[3], "user_type": row[4]}
    except Exception as e:
        if "unique" in str(e).lower() or "duplicate" in str(e).lower():
            raise HTTPException(status_code=400, detail="An account with this email already exists.")
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")

# ─── LOGIN ────────────────────────────────────────────────────────────────────

@router.post("/login")
async def login(request: EmailAuthRequest):
    try:
        import hashlib
        password_hash = hashlib.sha256(request.password.encode()).hexdigest()
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, email, name, governorate, user_type, picture
            FROM users WHERE email = %s AND password_hash = %s
        """, (request.email, password_hash))
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        cur.execute("UPDATE users SET last_login = %s WHERE email = %s", (datetime.now(), request.email))
        conn.commit()
        _ensure_forum_user(cur, row[1], row[2], row[3])
        cur.execute("SELECT id FROM forum_users WHERE email = %s", (row[1],))
        frow = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return {"id": row[0], "email": row[1], "name": row[2], "governorate": row[3], "user_type": row[4], "picture": row[5], "forum_token": _make_forum_token(frow[0]) if frow else None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")

# ─── UPDATE PROFILE ───────────────────────────────────────────────────────────

@router.put("/update")
async def update_profile(request: UpdateRequest):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            UPDATE users SET
                name        = COALESCE(%s, name),
                governorate = COALESCE(%s, governorate),
                user_type   = COALESCE(%s, user_type)
            WHERE email = %s
            RETURNING id, email, name, governorate, user_type, picture
        """, (request.name, request.governorate, request.user_type, request.email))
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        if not row:
            raise HTTPException(status_code=404, detail="User not found.")
        _ensure_forum_user(cur, row[1], row[2], row[3])
        cur.execute("SELECT id FROM forum_users WHERE email = %s", (row[1],))
        frow = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return {"id": row[0], "email": row[1], "name": row[2], "governorate": row[3], "user_type": row[4], "picture": row[5], "forum_token": _make_forum_token(frow[0]) if frow else None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update error: {str(e)}")

# ─── DELETE ACCOUNT ───────────────────────────────────────────────────────────

@router.delete("/delete")
async def delete_account(request: DeleteRequest):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("DELETE FROM users WHERE email = %s RETURNING id", (request.email,))
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        if not row:
            raise HTTPException(status_code=404, detail="User not found.")
        send_account_deleted(request.email)
        return {"message": "Account deleted successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete error: {str(e)}")