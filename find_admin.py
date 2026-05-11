from app.database import SessionLocal
from app.forum.models import ForumUser
db = SessionLocal()
user = db.query(ForumUser).filter(ForumUser.is_admin == True).first()
if user:
    print(f"Admin user: {user.email}")
else:
    print("No admin user found")
    users = db.query(ForumUser).limit(5).all()
    for u in users:
        print(f"  User: {u.email}")
db.close()
