from app.database import SessionLocal
from app.models.user import User
from passlib.context import CryptContext

email = "admin@weatherguard.com"
db = SessionLocal()
user = db.query(User).filter(User.email == email).first()

if user:
    is_admin = getattr(user, "is_admin", False)
    print(f"User found: email={user.email}, is_admin={is_admin}")
    if not is_admin:
        user.is_admin = True
        db.commit()
        print("Promoted to admin!")
    else:
        print("Already an admin.")
else:
    print("User not found. Creating admin user...")
    pwd = CryptContext(schemes=["bcrypt"])
    new_user = User(
        email=email,
        name="Admin",
        is_admin=True,
        password_hash=pwd.hash("admin123"),
    )
    db.add(new_user)
    db.commit()
    print("Created admin user with password: admin123")

db.close()
