from fastapi import FastAPI
from sqladmin import Admin
from app.database import engine

def setup_admin(app: FastAPI) -> None:
    admin = Admin(
        app=app,
        engine=engine,
        title='WeatherGuardTN Admin Panel'
    )
    
    from app.admin.views import register_views
    register_views(admin)
    
    print('✅ SQLAdmin panel mounted at /admin')
