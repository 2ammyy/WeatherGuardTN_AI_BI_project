from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os
import psycopg2
from datetime import datetime

router = APIRouter()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "932539718184-1rrvuua9t4907c8nkirk8n18cglm17hk.apps.googleusercontent.com")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://weatheruser:weatherpass@db:5432/weatherguard")

def get_db():
    return psycopg2.connect(DATABASE_URL)

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
        idinfo = id_token.verify_oauth2_token(
            request.token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
        conn = get_db()
        cur = conn.cursor()
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
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return {
            "id": row[0], "email": row[1], "name": row[2],
            "picture": row[3], "governorate": row[4],
            "user_type": row[5], "google_id": row[6]
        }
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auth error: {str(e)}")

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
        conn.commit()
        cur.close()
        conn.close()
        return {"id": row[0], "email": row[1], "name": row[2], "governorate": row[3], "user_type": row[4]}
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    except Exception as e:
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
        cur.execute("UPDATE users SET last_login = %s WHERE email = %s", (datetime.now(), request.email))
        conn.commit()
        cur.close()
        conn.close()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        return {"id": row[0], "email": row[1], "name": row[2], "governorate": row[3], "user_type": row[4], "picture": row[5]}
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
        return {"id": row[0], "email": row[1], "name": row[2], "governorate": row[3], "user_type": row[4], "picture": row[5]}
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
        return {"message": "Account deleted successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete error: {str(e)}")