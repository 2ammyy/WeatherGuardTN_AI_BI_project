"""
Run this script inside the Docker container to promote a user to admin.
Usage: python scripts/set_admin.py user@example.com
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.models.user import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

def set_admin(email: str, make_admin: bool = True):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"❌ User '{email}' not found")
            return False
        user.is_admin = make_admin
        db.commit()
        print(f"✅ User '{email}' is now {'admin' if make_admin else 'regular user'}")
        return True
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        return False
    finally:
        db.close()

def list_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        if not users:
            print("No users found.")
            return
        print(f"\n{'Email':35} {'Name':20} {'Admin':8} {'Type':15}")
        print("-" * 80)
        for u in users:
            print(f"{u.email:35} {(u.name or ''):20} {'✅' if u.is_admin else '❌':8} {(u.user_type or ''):15}")
    finally:
        db.close()

def create_admin(email: str, name: str, password: str):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"User '{email}' already exists.")
            return
        user = User(
            email=email,
            name=name,
            password_hash=pwd_context.hash(password),
            is_admin=True,
            user_type="government",
        )
        db.add(user)
        db.commit()
        print(f"✅ Admin user '{email}' created successfully!")
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python scripts/set_admin.py list")
        print("  python scripts/set_admin.py promote user@example.com")
        print("  python scripts/set_admin.py create user@example.com 'Full Name' password123")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "list":
        list_users()
    elif cmd == "promote" and len(sys.argv) >= 3:
        set_admin(sys.argv[2], True)
    elif cmd == "demote" and len(sys.argv) >= 3:
        set_admin(sys.argv[2], False)
    elif cmd == "create" and len(sys.argv) >= 5:
        create_admin(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        print("Invalid command or missing arguments.")
