from fastapi import FastAPI
from sqladmin import Admin
from app.database import engine
from app.admin.auth import admin_auth_backend

def setup_admin(app: FastAPI) -> None:
    '''Setup SQLAdmin with authentication'''
    admin = Admin(
        app=app,
        engine=engine,
        title='WeatherGuardTN Admin Panel',
        authentication_backend=admin_auth_backend
    )
    
    from app.admin.views import register_views
    register_views(admin)
    
    print('✅ SQLAdmin with authentication mounted at /admin')
