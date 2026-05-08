import os
from fastapi import FastAPI, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
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

    @app.get('/superset-dashboard')
    async def superset_dashboard_page(request: Request):
        try:
            await require_admin(request)
        except Exception:
            return RedirectResponse(url="/admin/login")
        return HTMLResponse("""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="origin">
  <title>WeatherGuardTN — Superset Dashboards</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { margin:0; padding:0; height:100%; overflow:hidden; }
    body {
      background:#0f172a; color:#e2e8f0; font-family:system-ui,-apple-system,sans-serif;
      display:flex; flex-direction:column;
    }
    .top-bar {
      display:flex; align-items:center; justify-content:space-between;
      padding:16px 24px; background:linear-gradient(135deg,#0f172a,#1e293b);
      border-bottom:1px solid #334155;
    }
    .top-bar h1 { font-size:20px; font-weight:600; display:flex; align-items:center; gap:10px; }
    .top-bar h1 span { color:#059669; }
    .top-bar a {
      color:#94a3b8; text-decoration:none; font-size:13px; padding:6px 14px;
      border-radius:6px; background:#1e293b; border:1px solid #334155;
      transition:all .2s;
    }
    .top-bar a:hover { color:#fff; background:#334155; border-color:#475569; }
    .top-bar { flex-shrink:0; }
    .content { flex:1; padding:24px 24px 0; margin:0 auto; width:100%; display:flex; flex-direction:column; min-height:0; }
    .content h2 { font-size:22px; margin-bottom:8px; }
    .content p { color:#94a3b8; margin-bottom:24px; }
    #dashboard-container {
      width:100%; flex:1; min-height:0; border:1px solid #334155;
      border-radius:12px; overflow:hidden; background:#0f172a; position:relative;
    }
    #dashboard-container iframe { width:100%; height:100%; border:none; }
    .loading {
      display:flex; align-items:center; justify-content:center; height:75vh;
      color:#94a3b8; font-size:15px; gap:12px;
    }
    .spinner {
      width:24px; height:24px; border:3px solid #334155;
      border-top-color:#059669; border-radius:50%; animation:spin .8s linear infinite;
    }
    @keyframes spin { to { transform:rotate(360deg); } }
    .error-msg {
      display:none; align-items:center; gap:12px; padding:16px 24px;
      background:#1e293b; border:1px solid #ef4444; border-radius:10px;
      color:#fca5a5; font-size:14px; margin-bottom:16px;
    }
    .error-msg i { color:#ef4444; font-size:18px; }
  </style>
</head>
<body>
  <div class="top-bar">
    <h1><span>&#9783;</span> WeatherGuard<span style="font-weight:400;color:#64748b">TN</span> Analytics</h1>
    <a href="/admin"><i class="fa-solid fa-arrow-left"></i> Back to Admin</a>
  </div>
  <div class="content">
    <h2>Superset Dashboards</h2>
    <p>Interactive analytics embedded directly in the admin panel.</p>
    <div id="error-msg" class="error-msg">
      <i class="fa-solid fa-circle-exclamation"></i>
      <span id="error-text">Failed to load dashboard.</span>
    </div>
    <div id="dashboard-container">
      <div class="loading" id="loading">
        <div class="spinner"></div>
        Loading Superset dashboard...
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/@superset-ui/embedded-sdk@0.1.3/bundle/index.js"></script>
  <script>
    (async function() {
      try {
        const resp = await fetch('/api/admin/superset/guest-token');
        if (!resp.ok) throw new Error('Guest token request failed: ' + resp.status);
        const data = await resp.json();
        const uuid = data.embedded_uuid;
        const token = data.token;

        if (!uuid) throw new Error('No embedded dashboard UUID found. Create one via Superset API.');

        document.getElementById('loading').style.display = 'none';

        const guestToken = typeof token === 'string' ? token : token.token;
        await supersetEmbeddedSdk.embedDashboard({
          id: uuid,
          supersetDomain: 'http://localhost:8088',
          mountPoint: document.getElementById('dashboard-container'),
          fetchGuestToken: () => guestToken,
          dashboardUiConfig: {
            hideTitle: true,
            hideTab: true,
            hideChartControls: true,
          },
        });
      } catch (err) {
        document.getElementById('loading').style.display = 'none';
        const el = document.getElementById('error-msg');
        el.style.display = 'flex';
        document.getElementById('error-text').textContent = err.message || 'Failed to load dashboard';
        console.error('Superset embed error:', err);
      }
    })();
  </script>
</body>
</html>
        """)

    print('✅ Admin panel with API mounted at /admin')
