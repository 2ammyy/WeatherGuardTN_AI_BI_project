from sqladmin.authentication import AuthenticationBackend
from fastapi import Request
from app.models.user import User
from app.database import SessionLocal
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta
import os

SECRET_KEY = os.getenv('FORUM_SECRET_KEY', 'weatherguardtn-admin-secret-2026')
ALGORITHM = 'HS256'
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        email = form.get('username')
        password = form.get('password')

        if not email or not password:
            return False

        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                return False

            # Use the correct field name from your model
            if not user.password_hash or not pwd_context.verify(password, user.password_hash):
                return False

            # Check admin flag
            if not getattr(user, 'is_admin', False):
                return False

            # Create session token
            token = jwt.encode({
                'sub': user.email,
                'exp': datetime.utcnow() + timedelta(hours=12)
            }, SECRET_KEY, algorithm=ALGORITHM)

            request.session['token'] = token
            return True
        finally:
            db.close()

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        token = request.session.get('token')
        if not token:
            return False
        try:
            jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return True
        except:
            return False

admin_auth_backend = AdminAuth(secret_key=SECRET_KEY)
