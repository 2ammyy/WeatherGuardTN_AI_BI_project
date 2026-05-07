from fastapi import FastAPI
from sqladmin import Admin
from app.database import engine
from app.admin.auth import admin_auth_backend

def setup_admin(app: FastAPI) -> None:
    admin = Admin(
        app=app,
        engine=engine,
        title='WeatherGuardTN Admin Panel',
        authentication_backend=admin_auth_backend,
    )

    from app.admin.api import router as admin_api_router
    app.include_router(admin_api_router, prefix='/api/admin')

    from app.admin.views import register_views
    register_views(admin)

    print('✅ Admin panel with API mounted at /admin')
