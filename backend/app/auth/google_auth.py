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
    conn = psycopg2.connect(DATABASE_URL)
    return conn

class GoogleAuthRequest(BaseModel):
    token: str
    governorate: str = None
    user_type: str = None

@router.post("/google")
async def google_auth(request: GoogleAuthRequest):
    try:
        idinfo = id_token.verify_oauth2_token(
            request.token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
        user_data = {
            "id": idinfo["sub"],
            "email": idinfo["email"],
            "name": idinfo.get("name", idinfo["email"]),
            "picture": idinfo.get("picture", None),
            "governorate": request.governorate,
            "user_type": request.user_type,
        }
        # Save or update user in DB
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO users (google_id, email, name, picture, governorate, user_type, last_login)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (google_id) DO UPDATE SET
                last_login = %s,
                governorate = COALESCE(%s, users.governorate),
                user_type = COALESCE(%s, users.user_type)
            RETURNING id, governorate, user_type
        """, (
            user_data["id"], user_data["email"], user_data["name"],
            user_data["picture"], user_data["governorate"], user_data["user_type"],
            datetime.now(),
            datetime.now(), user_data["governorate"], user_data["user_type"]
        ))
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        user_data["db_id"] = row[0]
        user_data["governorate"] = row[1]
        user_data["user_type"] = row[2]
        return user_data
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auth error: {str(e)}")

class EmailAuthRequest(BaseModel):
    email: str
    password: str
    name: str = None
    governorate: str = None
    user_type: str = None

@router.post("/register")
async def register(request: EmailAuthRequest):
    try:
        import hashlib
        password_hash = hashlib.sha256(request.password.encode()).hexdigest()
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO users (email, name, governorate, user_type)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (email) DO NOTHING
            RETURNING id, email, name, governorate, user_type
        """, (request.email, request.name, request.governorate, request.user_type))
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        if not row:
            raise HTTPException(status_code=400, detail="Email already exists")
        return {"id": row[0], "email": row[1], "name": row[2], "governorate": row[3], "user_type": row[4]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")

@router.post("/login")
async def login(request: EmailAuthRequest):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT id, email, name, governorate, user_type FROM users WHERE email = %s", (request.email,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            raise HTTPException(status_code=401, detail="User not found")
        return {"id": row[0], "email": row[1], "name": row[2], "governorate": row[3], "user_type": row[4]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")
