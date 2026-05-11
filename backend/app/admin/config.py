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

    @app.get('/superset-charts')
    async def superset_charts_page(request: Request):
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
  <title>WeatherGuardTN — Charts</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { height:100%; overflow:hidden; }
    body {
      background:#0f172a; color:#e2e8f0; font-family:system-ui,-apple-system,sans-serif;
      display:flex; flex-direction:column;
    }
    .top-bar {
      display:flex; align-items:center; justify-content:space-between;
      padding:16px 24px; background:linear-gradient(135deg,#0f172a,#1e293b);
      border-bottom:1px solid #334155; flex-shrink:0;
    }
    .top-bar h1 { font-size:20px; font-weight:600; }
    .top-bar h1 span { color:#059669; }
    .top-bar .nav-links { display:flex; gap:6px; flex-wrap:wrap; }
    .top-bar .nav-links a {
      color:#94a3b8; text-decoration:none; font-size:12px; padding:5px 12px;
      border-radius:6px; background:#1e293b; border:1px solid #334155;
      transition:all .2s; white-space:nowrap;
    }
    .top-bar .nav-links a:hover { color:#fff; background:#334155; }
    .top-bar .nav-links a.active { color:#fff; background:#059669; border-color:#059669; }
    .content { flex:1; padding:24px; overflow-y:auto; }
    .content h2 { font-size:22px; margin-bottom:4px; }
    .content p { color:#94a3b8; margin-bottom:20px; font-size:14px; }
    .chart-grid {
      display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr));
      gap:16px;
    }
    .chart-card {
      background:#1e293b; border:1px solid #334155; border-radius:12px;
      overflow:hidden; transition:all .2s;
    }
    .chart-card:hover { border-color:#059669; transform:translateY(-2px); }
    .chart-card .preview {
      width:100%; height:220px; border:none; background:#0f172a;
    }
    .chart-card .info {
      padding:14px 16px; border-top:1px solid #334155;
    }
    .chart-card .info h3 { font-size:14px; font-weight:600; margin-bottom:4px; }
    .chart-card .info .meta { font-size:11px; color:#64748b; display:flex; gap:10px; }
    .chart-card .info .meta .tag {
      background:#0f172a; padding:2px 8px; border-radius:4px; color:#059669;
    }
    .loading { display:flex; align-items:center; justify-content:center; height:50vh; color:#64748b; gap:10px; }
    .spinner { width:24px; height:24px; border:3px solid #334155; border-top-color:#059669; border-radius:50%; animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
  </style>
</head>
<body>
  <div class="top-bar">
    <h1><span>&#9783;</span> Superset Charts</h1>
    <div class="nav-links">
      <a href="/admin">Back to Admin</a>
    </div>
  </div>
  <div class="content">
    <h2>All Charts</h2>
    <p>Charts from Apache Superset. Keep Superset open in another tab (<a href="http://localhost:8088" target="_blank" style="color:#059669;">http://localhost:8088</a>) for charts to render.</p>
    <div class="chart-grid" id="chart-grid">
      <div class="loading"><div class="spinner"></div><span>Loading charts...</span></div>
    </div>
  </div>
  <script>
  (async function() {
    const grid = document.getElementById('chart-grid');
    try {
      const r = await fetch('/api/admin/superset/charts');
      const data = await r.json();
      const charts = data.charts || [];

      if (charts.length === 0) {
        grid.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b;">No charts found.</div>';
        return;
      }

      grid.innerHTML = charts.map(c => `
        <div class="chart-card">
          <iframe class="preview" src="http://localhost:8088/explore/?slice_id=${c.id}&standalone=3"
                  loading="lazy" scrolling="no"></iframe>
          <div class="info">
            <h3>${c.name}</h3>
            <div class="meta">
              <span class="tag">${c.viz_type}</span>
              <span>${c.datasource}</span>
              <a href="http://localhost:8088${c.url}" target="_blank" style="color:#059669;margin-left:auto;">Open &rarr;</a>
            </div>
          </div>
        </div>
      `).join('');
    } catch(e) {
      grid.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;">Failed to load: ' + e.message + '</div>';
    }
  })();
  </script>
</body>
</html>
        """)

    @app.get('/superset-dashboard')
    async def superset_dashboard_page():
        return RedirectResponse(url="/superset-charts")

    print('✅ Admin panel with API mounted at /admin')
