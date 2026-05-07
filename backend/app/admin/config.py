import os
from fastapi import FastAPI, Depends, Request
from fastapi.responses import HTMLResponse
from sqladmin import Admin
from app.database import engine
from app.admin.auth import admin_auth_backend
from app.admin.api import require_admin

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

    @app.get('/admin/moderation-test', dependencies=[Depends(require_admin)])
    async def moderation_test_page():
        html_path = os.path.join(os.path.dirname(__file__), '..', '..', 'templates', 'moderation_test.html')
        with open(html_path, encoding='utf-8') as f:
            return HTMLResponse(f.read())

    print('✅ Admin panel with API mounted at /admin')
