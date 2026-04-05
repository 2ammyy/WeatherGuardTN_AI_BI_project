from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os

router = APIRouter()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "932539718184-1rrvuua9t4907c8nkirk8n18cglm17hk.apps.googleusercontent.com")

class GoogleAuthRequest(BaseModel):
    token: str  # The Google ID token sent from the frontend

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: str | None = None

@router.post("/google", response_model=UserResponse)
async def google_auth(request: GoogleAuthRequest):
    try:
        # Verify the Google token
        idinfo = id_token.verify_oauth2_token(
            request.token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )

        # Token is valid — extract user info
        user_data = {
            "id": idinfo["sub"],
            "email": idinfo["email"],
            "name": idinfo.get("name", idinfo["email"]),
            "picture": idinfo.get("picture", None),
        }

        return UserResponse(**user_data)

    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auth error: {str(e)}")