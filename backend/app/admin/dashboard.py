from sqladmin import BaseView, expose
from starlette.responses import HTMLResponse
from app.admin.api import get_stats

DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
.dashboard { max-width: 1400px; margin: 0 auto; padding: 32px 24px; }
.header { margin-bottom: 32px; }
.header h1 { font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #10b981, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.header p { color: #64748b; font-size: 14px; margin-top: 4px; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 32px; }
.stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; transition: all 0.2s; }
.stat-card:hover { border-color: #10b981; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
.stat-icon { font-size: 24px; margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: 700; color: #f1f5f9; }
.stat-label { font-size: 13px; color: #64748b; margin-top: 4px; }
.stat-sub { font-size: 12px; color: #475569; margin-top: 2px; }
.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 16px; margin-bottom: 32px; }
.chart-card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; }
.chart-card h3 { font-size: 14px; font-weight: 600; color: #94a3b8; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }
.chart-container { position: relative; height: 250px; }
.moderation-bar { display: flex; gap: 16px; margin-bottom: 32px; }
.mod-stat { flex: 1; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 16px; text-align: center; }
.mod-stat .value { font-size: 24px; font-weight: 700; }
.mod-stat .label { font-size: 12px; color: #64748b; margin-top: 4px; }
.bar-container { height: 6px; background: #334155; border-radius: 3px; margin-top: 8px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s; }
.recent-list { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 20px; }
.recent-list h3 { font-size: 14px; font-weight: 600; color: #94a3b8; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
.recent-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #1e293b; }
.recent-item:last-child { border-bottom: none; }
.badge { padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
.badge-approved { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.badge-rejected { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.badge-pending { background: rgba(234, 179, 8, 0.15); color: #eab308; }
.quick-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 32px; }
.quick-action { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: #1e293b; border: 1px solid #334155; border-radius: 12px; color: #e2e8f0; text-decoration: none; font-size: 14px; font-weight: 500; transition: all 0.2s; }
.quick-action:hover { border-color: #10b981; background: #334155; transform: translateY(-1px); }
@media (max-width: 768px) { .charts-grid { grid-template-columns: 1fr; } .stats-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
</head>
<body>
<div class="dashboard" id="app">
  <div class="header">
    <h1>📊 Admin Dashboard</h1>
    <p>WeatherGuardTN — Platform overview & moderation analytics</p>
  </div>

  <div class="quick-actions">
    <a href="/admin/forumpost/list" class="quick-action">📝 Posts</a>
    <a href="/admin/forumcomment/list" class="quick-action">💬 Comments</a>
    <a href="/admin/postreport/list" class="quick-action">🚩 Reports</a>
    <a href="/admin/user/list" class="quick-action">👥 Users</a>
    <a href="/admin/newsarticle/list" class="quick-action">📰 News</a>
    <a href="/admin/notification/list" class="quick-action">🔔 Notifications</a>
  </div>

  <div class="stats-grid" id="statsGrid">
    <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-value">—</div><div class="stat-label">Total Users</div></div>
    <div class="stat-card"><div class="stat-icon">📝</div><div class="stat-value">—</div><div class="stat-label">Total Posts</div></div>
    <div class="stat-card"><div class="stat-icon">💬</div><div class="stat-value">—</div><div class="stat-label">Total Comments</div></div>
    <div class="stat-card"><div class="stat-icon">📰</div><div class="stat-value">—</div><div class="stat-label">News Articles</div></div>
    <div class="stat-card"><div class="stat-icon">🚩</div><div class="stat-value">—</div><div class="stat-label">Pending Reports</div></div>
    <div class="stat-card"><div class="stat-icon">📈</div><div class="stat-value">—</div><div class="stat-label">Posts (7d)</div></div>
  </div>

  <div class="moderation-bar">
    <div class="mod-stat"><div class="value" id="modTotal">—</div><div class="label">Total Checked</div></div>
    <div class="mod-stat"><div class="value" style="color:#10b981" id="modApproved">—</div><div class="label">AI Approved</div></div>
    <div class="mod-stat"><div class="value" style="color:#ef4444" id="modRejected">—</div><div class="label">AI Rejected</div></div>
    <div class="mod-stat"><div class="value" style="color:#06b6d4" id="modRate">—</div><div class="label">Approval Rate</div>
      <div class="bar-container"><div class="bar-fill" id="modRateBar" style="width:0%;background:linear-gradient(90deg,#10b981,#06b6d4)"></div></div>
    </div>
  </div>

  <div class="charts-grid">
    <div class="chart-card"><h3>📊 Risk Level Distribution</h3><div class="chart-container"><canvas id="riskChart"></canvas></div></div>
    <div class="chart-card"><h3>📍 Top Governorates</h3><div class="chart-container"><canvas id="govChart"></canvas></div></div>
  </div>

  <div class="recent-list" style="margin-bottom:32px">
    <h3 style="display:flex;align-items:center;justify-content:space-between">🚩 Pending Reports <span id="reportCount" style="font-size:12px;color:#64748b;font-weight:400"></span></h3>
    <div id="pendingReports"><p style="color:#64748b;font-size:13px">Loading...</p></div>
  </div>

  <div class="recent-list">
    <h3>🕐 Recent AI Moderation Decisions</h3>
    <div id="recentModeration"><p style="color:#64748b;font-size:13px">Loading...</p></div>
  </div>
</div>

<script>
async function loadData() {
  try {
    const res = await fetch('/api/admin/stats');
    if (!res.ok) throw new Error('Failed to load');
    const data = await res.json();

    const cards = document.querySelectorAll('.stat-card');
    const stats = [
      data.users.total, data.posts.total, data.comments.total,
      data.news.total, data.reports.pending, data.posts.week
    ];
    cards.forEach((card, i) => { card.querySelector('.stat-value').textContent = stats[i] ?? '—'; });

    document.getElementById('modTotal').textContent = data.moderation.total_checked;
    document.getElementById('modApproved').textContent = data.moderation.ai_approved;
    document.getElementById('modRejected').textContent = data.moderation.ai_rejected;
    document.getElementById('modRate').textContent = data.moderation.approval_rate + '%';
    document.getElementById('modRateBar').style.width = data.moderation.approval_rate + '%';

    const riskCtx = document.getElementById('riskChart').getContext('2d');
    const riskLabels = Object.keys(data.risk_distribution);
    const riskValues = Object.values(data.risk_distribution);
    const riskColors = {green:'#22c55e',yellow:'#eab308',orange:'#f97316',red:'#ef4444',purple:'#a855f7'};
    new Chart(riskCtx, { type: 'doughnut', data: {
      labels: riskLabels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
      datasets: [{ data: riskValues, backgroundColor: riskLabels.map(l => riskColors[l] || '#64748b'), borderWidth: 0 }]
    }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } } } });

    const govCtx = document.getElementById('govChart').getContext('2d');
    const govLabels = Object.keys(data.top_governorates);
    new Chart(govCtx, { type: 'bar', data: {
      labels: govLabels,
      datasets: [{ label: 'Posts', data: Object.values(data.top_governorates), backgroundColor: '#10b981', borderRadius: 6 }]
    }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' } } } } });
  } catch(e) {
    document.querySelector('.dashboard').innerHTML += '<p style="color:#ef4444;padding:20px">❌ Failed to load dashboard data. Make sure you are logged in.</p>';
  }
}

async function loadRecentModeration() {
  try {
    const res = await fetch('/api/admin/moderation/recent?limit=15');
    if (!res.ok) throw new Error('Failed');
    const items = await res.json();
    const container = document.getElementById('recentModeration');
    container.innerHTML = items.map(p => `
      <div class="recent-item">
        <span>${p.title}</span>
        <span class="badge ${p.ai_approved ? 'badge-approved' : 'badge-rejected'}">${p.ai_approved ? '✓ Approved' : '✗ Rejected'}</span>
      </div>
    `).join('');
  } catch(e) {
    document.getElementById('recentModeration').innerHTML = '<p style="color:#64748b;font-size:13px">No recent moderation data</p>';
  }
}

async function loadPendingReports() {
  try {
    const res = await fetch('/api/admin/moderation/pending-reports');
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();
    document.getElementById('reportCount').textContent = `(${data.total} pending)`;
    const container = document.getElementById('pendingReports');
    const allReports = [
      ...data.post_reports.map(r => ({...r, subtype: 'Post'})),
      ...data.comment_reports.map(r => ({...r, subtype: 'Comment'})),
      ...data.user_reports.map(r => ({...r, subtype: 'User'})),
    ];
    if (allReports.length === 0) {
      container.innerHTML = '<p style="color:#64748b;font-size:13px">✅ No pending reports</p>';
      return;
    }
    container.innerHTML = allReports.map(r => `
      <div class="recent-item">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge badge-pending">${r.subtype}</span>
          <span style="font-size:13px">${r.reason || 'No reason provided'}</span>
        </div>
        <div style="display:flex;gap:6px">
          <button onclick="resolveReport('${r.type}','${r.id}','approved')" style="padding:4px 12px;border-radius:6px;border:1px solid #10b981;background:transparent;color:#10b981;cursor:pointer;font-size:11px">✓ Approve</button>
          <button onclick="resolveReport('${r.type}','${r.id}','dismissed')" style="padding:4px 12px;border-radius:6px;border:1px solid #64748b;background:transparent;color:#64748b;cursor:pointer;font-size:11px">✕ Dismiss</button>
        </div>
      </div>
    `).join('');
  } catch(e) {
    document.getElementById('pendingReports').innerHTML = '<p style="color:#64748b;font-size:13px">Could not load reports</p>';
  }
}

async function resolveReport(type, id, action) {
  try {
    const res = await fetch(`/api/admin/moderation/resolve/${type}/${id}?action=${action}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed');
    loadPendingReports();
  } catch(e) {
    alert('Failed to resolve report');
  }
}

loadData();
loadRecentModeration();
loadPendingReports();
</script>
</body>
</html>
"""

class DashboardView(BaseView):
    name = "Dashboard"
    icon = "fa-solid fa-chart-line"

    @expose("/dashboard", methods=["GET"])
    def dashboard_page(self, request):
        return HTMLResponse(DASHBOARD_HTML)
