"""
WeatherGuardTN — Initialize Superset with databases, charts & dashboards
Usage:
    docker exec climate-superset python /app/scripts/init_superset.py
    # OR from host if superset is exposed:
    python backend/scripts/init_superset.py
"""
import requests, json, sys, time, os

BASE = os.getenv("SUPERSET_BASE", "http://localhost:8088")
LOGIN_USER = os.getenv("SUPERSET_LOGIN_USER", "admin")
LOGIN_PASS = os.getenv("SUPERSET_LOGIN_PASSWORD", "admin123")
DB_URI = os.getenv("SUPERSET_DB_URI", "postgresql://weatheruser:weatherpass@climate-db:5432/weatherguard")

session = requests.Session()
_rate_limit = 0  # tracks last call time

def api(method, path, **kwargs):
    global _rate_limit
    for attempt in range(3):
        elapsed = time.time() - _rate_limit
        if elapsed < 0.12:
            time.sleep(0.12 - elapsed)
        _rate_limit = time.time()
        r = getattr(session, method)(f"{BASE}{path}", **kwargs)
        if r.status_code == 429 and attempt < 2:
            time.sleep(1.0)
            continue
        break
    if r.status_code >= 400:
        try:
            body = r.json()
            detail = body.get("message") or body.get("description") or str(body)
        except Exception:
            detail = r.text[:200]
        print(f"  ⚠ {method.upper()} {path} → {r.status_code}: {detail}")
        return None
    try:
        return r.json()
    except Exception:
        return r.text

def login():
    r = api("post", "/api/v1/security/login", json={
        "username": LOGIN_USER, "password": LOGIN_PASS, "provider": "db", "refresh": True,
    })
    if not r:
        print("  ❌ Login failed. Is Superset running?")
        sys.exit(1)
    session.headers.update({"Authorization": f"Bearer {r['access_token']}"})
    print("  ✅ Authenticated")

# ── Database ───────────────────────────────────────────────────────

def get_or_create_database():
    dbs = api("get", "/api/v1/database/")
    if dbs:
        for db in dbs.get("result", []):
            if db["database_name"] == "WeatherGuardTN":
                print(f"  ✅ Database exists (id={db['id']})")
                return db["id"]
    r = api("post", "/api/v1/database/", json={
        "database_name": "WeatherGuardTN",
        "sqlalchemy_uri": DB_URI,
        "expose_in_sqllab": True,
        "allow_dml": False,
    })
    if r and "id" in r:
        print(f"  ✅ Database created (id={r['id']})")
        return r["id"]
    print("  ❌ Failed to create database")
    return None

# ── Datasets ───────────────────────────────────────────────────────

def find_dataset_obj(name):
    r = api("get", "/api/v1/dataset/?q=(page_size:200)")
    if r and r.get("result"):
        for ds in r["result"]:
            if ds.get("table_name") == name:
                return ds
    return None

def create_dataset(db_id, name, sql=None, physical=False):
    existing = find_dataset_obj(name)
    if existing:
        if not physical and sql:
            old = api("get", f"/api/v1/dataset/{existing['id']}")
            if old and old.get("result", {}).get("sql") != sql:
                api("put", f"/api/v1/dataset/{existing['id']}", json={"sql": sql})
                time.sleep(0.3)
                api("put", f"/api/v1/dataset/{existing['id']}", json={})
                print(f"  ℹ Updated SQL for dataset '{name}'")
            else:
                print(f"  ℹ Dataset '{name}' exists")
        else:
            print(f"  ℹ Dataset '{name}' exists")
        return True
    if physical:
        # Register physical table from DB schema
        r = api("post", "/api/v1/dataset/", json={
            "database": db_id, "schema": "public",
            "table_name": name,
        })
    else:
        r = api("post", "/api/v1/dataset/", json={
            "database": db_id, "schema": "public",
            "table_name": name, "sql": sql,
        })
    if r and "id" in r:
        print(f"  ✅ Created dataset '{name}' (id={r['id']})")
        time.sleep(0.5)
        api("put", f"/api/v1/dataset/{r['id']}", json={})
        return True
    print(f"  ❌ Dataset '{name}' failed")
    return False

def create_datasets(db_id, configs):
    for cfg in configs:
        create_dataset(db_id, cfg["name"], cfg["sql"])

# ── Charts ─────────────────────────────────────────────────────────

def find_chart(name):
    r = api("get", "/api/v1/chart/?q=(page_size:200)")
    if r and r.get("result"):
        for c in r["result"]:
            if c.get("slice_name") == name:
                return c["id"]
    return None

def create_chart(name, viz_type, params):
    existing = find_chart(name)
    if existing:
        print(f"  ℹ Chart '{name}' exists (id={existing})")
        return existing
    # Find the matching dataset by convention
    ds_name = None
    for key in ["news", "scraping", "articles"]:
        if key in name.lower():
            ds_name = "news"
            break
    for key in ["user", "engagement", "governorate"]:
        if key in name.lower() and not ds_name:
            ds_name = "users"
            break
    for key in ["risk", "alert", "report", "moderation", "priority"]:
        if key in name.lower() and not ds_name:
            ds_name = "risk"
            break
    for key in ["daily", "post", "category"]:
        if key in name.lower() and not ds_name:
            ds_name = "posts"
            break

    # Look up dataset id
    ds_r = api("get", f"/api/v1/dataset/?q=(filters:!((col:table_name,opr:eq,value:wg_{ds_name or 'general'})))")
    if not ds_r or ds_r.get("count", 0) == 0:
        # Try first available dataset
        ds_r = api("get", "/api/v1/dataset/?q=(page_size:1)")
    if not ds_r or ds_r.get("count", 0) == 0:
        print(f"  ❌ No dataset found for chart '{name}'")
        return None
    ds_id = ds_r["result"][0]["id"]

    payload = {
        "datasource_id": ds_id,
        "datasource_type": "table",
        "slice_name": name,
        "viz_type": viz_type,
        "params": json.dumps(params),
        "query_context_generation": False,
    }
    r = api("post", "/api/v1/chart/", json=payload)
    if r and "id" in r:
        print(f"  ✅ Created chart '{name}' (id={r['id']})")
        return r["id"]
    return None

def create_charts(chart_configs):
    ids = []
    for cfg in chart_configs:
        cid = create_chart(cfg["name"], cfg["viz"], cfg["params"])
        if cid:
            ids.append(cid)
    return ids

# ── Dashboards ─────────────────────────────────────────────────────

def find_dashboard(title):
    r = api("get", "/api/v1/dashboard/?q=(page_size:50)")
    if r and r.get("result"):
        for d in r["result"]:
            if d.get("dashboard_title") == title:
                return d
    return None

def enable_embedding(dash_id):
    r = api("get", f"/api/v1/dashboard/{dash_id}/embedded")
    if r and r.get("result", {}).get("uuid"):
        print(f"  ℹ Embedding already enabled (uuid={r['result']['uuid'][:8]}...)")
        return r["result"]["uuid"]
    r2 = api("post", f"/api/v1/dashboard/{dash_id}/embedded", json={
        "allowed_domains": ["http://localhost:8001", "http://localhost:3000", "http://127.0.0.1:8001"],
    })
    if r2 and "result" in r2:
        uuid = r2["result"].get("uuid", "")
        print(f"  ✅ Embedding enabled (uuid={uuid[:8]}...)")
        return uuid
    print("  ⚠ Auto-embedding not available. Enable manually:")
    print(f"    1. Open http://localhost:8088/superset/dashboard/{dash_id}/")
    print("    2. Settings (gear icon) → Share → Enable Embedding → Save")

def delete_dashboard(title):
    existing = find_dashboard(title)
    if existing:
        api("delete", f"/api/v1/dashboard/{existing['id']}")
        print(f"  🗑 Deleted old dashboard '{title}'")
        time.sleep(1)

def create_or_update_dashboard(title, chart_ids):
    existing = find_dashboard(title)
    if existing:
        print(f"  ℹ Dashboard '{title}' exists (id={existing['id']})")
        return existing["id"]

    slug = title.lower().replace(" ", "-").replace("⚠","").replace("🌤","").replace("📰","").strip("-")
    r = api("post", "/api/v1/dashboard/", json={
        "dashboard_title": title,
        "slug": f"weatherguard-{slug[:30]}",
        "published": True,
    })
    if r and "id" in r:
        dash_id = r["id"]
        print(f"  ✅ Created dashboard '{title}' (id={dash_id})")
        return dash_id
    return None

def layout_dashboard(dash_id, chart_ids, title, cols=3):
    time.sleep(1)
    charts_info = {}
    for cid in chart_ids:
        r = api("get", f"/api/v1/chart/{cid}")
        if r and "result" in r:
            charts_info[cid] = r["result"].get("slice_name", f"Chart {cid}")

    entries, grid_kids = {}, []
    cell_w, cell_h = 4, 4
    n = len(chart_ids)

    for i, cid in enumerate(chart_ids):
        name = charts_info.get(cid, f"Chart {cid}")
        is_wide = i < 3
        w = 6 if is_wide else cell_w
        h = 3 if is_wide else cell_h
        if i < 3:
            x = (i % 2) * 6
            y = 0
        else:
            idx = i - 3
            per_row = 3
            x = (idx % per_row) * cell_w
            y = 3 + (idx // per_row) * cell_h

        cid_str = f"CHART-{i}"
        entries[cid_str] = {
            "type": "CHART", "id": cid_str, "children": [],
            "meta": {"chartId": cid, "width": w, "height": h, "sliceName": name},
            "parents": ["ROOT_ID", "GRID_ID"],
        }
        grid_kids.append(cid_str)

    pos = json.dumps({
        "DASHBOARD_VERSION_KEY": "v2",
        "ROOT_ID": {"type": "ROOT", "id": "ROOT_ID", "children": ["GRID_ID"], "parents": []},
        "GRID_ID": {"type": "GRID_CONTAINER", "id": "GRID_ID", "children": grid_kids, "parents": ["ROOT_ID"]},
        "HEADER_ID": {"type": "HEADER", "id": "HEADER_ID", "meta": {"text": title}},
        **entries,
    })
    meta = json.dumps({
        "show_native_filters": True, "expanded_slices": {},
        "color_scheme": "supersetColors",
    })
    r = api("put", f"/api/v1/dashboard/{dash_id}", json={
        "position_json": pos, "json_metadata": meta, "published": True,
    })
    if r:
        for cid in chart_ids:
            api("put", f"/api/v1/chart/{cid}", json={"dashboards": [dash_id]})
        print(f"  ✅ Laid out {len(chart_ids)} charts on dashboard")
    else:
        print(f"  ⚠ Layout failed")

def get_dataset_id_by_name(name):
    r = api("get", "/api/v1/dataset/?q=(page_size:200)")
    if r and r.get("result"):
        for ds in r["result"]:
            if ds.get("table_name") == name:
                return ds["id"]
    return None

def create_chart_for_dataset(dataset_name, name, viz_type, params):
    existing = find_chart(name)
    if existing:
        print(f"  ℹ Chart '{name}' exists (id={existing})")
        return existing
    ds_id = get_dataset_id_by_name(dataset_name)
    if not ds_id:
        print(f"  ❌ Dataset '{dataset_name}' not found for chart '{name}'")
        return None
    payload = {
        "datasource_id": ds_id,
        "datasource_type": "table",
        "slice_name": name,
        "viz_type": viz_type,
        "params": json.dumps(params),
        "query_context_generation": False,
    }
    r = api("post", "/api/v1/chart/", json=payload)
    if r and "id" in r:
        print(f"  ✅ Created chart '{name}' (id={r['id']})")
        return r["id"]
    return None

# ═══════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════

def main():
    print("=" * 64)
    print("  WeatherGuardTN — Superset Initialization")
    print("=" * 64)

    # 1. Login
    print("\n[1] Authenticating...")
    login()

    # 2. Database
    print("\n[2] Registering database...")
    db_id = get_or_create_database()
    if not db_id:
        sys.exit(1)

    # ─── DATASETS ───────────────────────────────────────────────

    print("\n[3] Creating datasets...")

    # Users & engagement dataset
    # Use physical table as dataset (avoids virtual dataset SQL parser issues)
    ds_users = {
        "name": "forum_users",
        "physical": True,
    }
    # Posts dataset
    ds_posts = {
        "name": "wg_posts",
        "sql": """SELECT
  fp.id, fp.title, fp.governorate, fp.category, fp.risk_level,
  fp.is_published, fp.ai_approved, fp.created_at,
  fp.likes_count, fp.comments_count, fp.shares_count,
  (fp.likes_count + fp.comments_count + fp.shares_count) AS engagement,
  fu.username AS author_name
FROM forum_posts fp
LEFT JOIN forum_users fu ON fu.id = fp.author_id
WHERE fp.is_deleted = false"""
    }
    # Risk & alerts dataset
    ds_risk = {
        "name": "wg_risk",
        "sql": """SELECT
  'Post' AS report_type, pr.id, pr.reason, pr.status, pr.priority,
  pr.priority_score, pr.created_at, fp.title AS related_title,
  fp.risk_level
FROM post_reports pr
LEFT JOIN forum_posts fp ON fp.id = pr.post_id
UNION ALL
SELECT 'Comment', cr.id, cr.reason, cr.status, cr.priority,
  cr.priority_score, cr.created_at, fc.body, NULL
FROM comment_reports cr
LEFT JOIN forum_comments fc ON fc.id = cr.comment_id
UNION ALL
SELECT 'User', ur.id, ur.reason, ur.status, ur.priority,
  ur.priority_score, ur.created_at, u.username, NULL
FROM user_reports ur
LEFT JOIN forum_users u ON u.id = ur.reported_id"""
    }
    # News & scraping dataset
    ds_news = {
        "name": "wg_news",
        "sql": """SELECT
  na.id, na.source_name, na.title, na.category, na.risk_level,
  na.governorates, na.published_at, na.scraped_at,
  na.likes_count, na.comments_count,
  coalesce(gov.governorate, '') AS governorate
FROM news_articles na
LEFT JOIN LATERAL unnest(
  CASE WHEN na.governorates IS NOT NULL AND coalesce(array_length(na.governorates, 1), 0) > 0
  THEN na.governorates ELSE ARRAY[''::varchar] END
) AS gov(governorate) ON true"""
    }
    # Moderation dataset
    ds_moderation = {
        "name": "wg_moderation",
        "sql": """SELECT
  DATE(fp.created_at) AS date, fp.category,
  COUNT(*) AS total_posts,
  SUM(CASE WHEN fp.ai_approved THEN 1 ELSE 0 END) AS ai_approved,
  SUM(CASE WHEN NOT fp.ai_approved AND NOT fp.is_published THEN 1 ELSE 0 END) AS pending,
  ROUND(
    100.0 * SUM(CASE WHEN fp.ai_approved THEN 1 ELSE 0 END) /
    NULLIF(COUNT(*), 0), 1
  ) AS approval_rate
FROM forum_posts fp
WHERE fp.is_deleted = false
  AND fp.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(fp.created_at), fp.category
ORDER BY DATE(fp.created_at) DESC"""
    }
    # Daily trends dataset
    ds_daily = {
        "name": "wg_daily",
        "sql": """SELECT
  DATE(fp.created_at) AS date,
  COUNT(DISTINCT fp.id) AS posts,
  COUNT(DISTINCT fc.id) AS comments
FROM forum_posts fp
LEFT JOIN forum_comments fc ON DATE(fc.created_at) = DATE(fp.created_at) AND fc.is_deleted = false
WHERE fp.is_deleted = false AND fp.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(fp.created_at)
ORDER BY DATE(fp.created_at)"""
    }
    # Governorate stats dataset
    ds_gov = {
        "name": "wg_governorates",
        "sql": """SELECT fu.governorate,
  COUNT(DISTINCT fu.id) AS users,
  COUNT(DISTINCT fp.id) AS posts,
  COUNT(DISTINCT fp2.id) AS high_risk_posts
FROM forum_users fu
LEFT JOIN forum_posts fp ON fp.author_id = fu.id AND fp.is_deleted = false
LEFT JOIN forum_posts fp2 ON fp2.author_id = fu.id AND fp2.is_deleted = false AND fp2.risk_level IN ('red', 'purple')
WHERE fu.governorate IS NOT NULL AND fu.governorate != ''
GROUP BY fu.governorate
ORDER BY posts DESC"""
    }

    for ds in [ds_users, ds_posts, ds_risk, ds_news, ds_moderation, ds_daily, ds_gov]:
        create_dataset(db_id, ds["name"], ds.get("sql"), ds.get("physical", False))

    # ─── CHARTS: Weather Overview ──────────────────────────────────

    print("\n[4] Creating charts...")
    print("\n  ── Dashboard: Weather Overview ──")

    C = lambda ds, n, v, p: create_chart_for_dataset(ds, n, v, p)
    overview_charts = []

    # Big number KPIs
    c = C("forum_users", "Total Users", "big_number_total", {
        "metric": {"expressionType": "SQL", "sqlExpression": "COUNT(*)"},
        "subheader": "Registered users", "y_axis_format": ",d",
        "time_range": "No filter",
    }); overview_charts.append(c)

    c = C("wg_posts", "Total Posts", "big_number_total", {
        "metric": {"expressionType": "SQL", "sqlExpression": "COUNT(DISTINCT id)"},
        "subheader": "Community posts", "y_axis_format": ",d",
        "time_range": "No filter",
    }); overview_charts.append(c)

    c = C("wg_daily", "Posts Today", "big_number_total", {
        "metric": {"expressionType": "SQL", "sqlExpression": "SUM(posts)"},
        "subheader": "Posts in last 24h", "y_axis_format": ",d",
        "time_range": "No filter",
    }); overview_charts.append(c)

    # Distribution charts
    c = C("wg_governorates", "Users by Governorate", "dist_bar", {
        "metrics": [{"expressionType": "SIMPLE", "column": {"column_name": "users"}, "aggregate": "SUM", "label": "Users"}],
        "groupby": ["governorate"], "order_desc": True, "row_limit": 15,
        "color_scheme": "supersetColors", "show_bar_value": True,
        "time_range": "No filter",
    }); overview_charts.append(c)

    c = C("wg_posts", "Posts by Category", "pie", {
        "metric": {"expressionType": "SQL", "sqlExpression": "COUNT(DISTINCT id)"},
        "groupby": ["category"], "row_limit": 10,
        "show_labels": True, "show_labels_threshold": 5,
        "time_range": "No filter",
    }); overview_charts.append(c)

    c = C("wg_posts", "Posts by Governorate", "dist_bar", {
        "metrics": [{"expressionType": "SQL", "sqlExpression": "COUNT(DISTINCT id)"}],
        "groupby": ["governorate"], "order_desc": True, "row_limit": 15,
        "color_scheme": "supersetColors", "show_bar_value": True,
        "time_range": "No filter",
    }); overview_charts.append(c)

    # Time series
    c = C("wg_daily", "Daily Activity (Posts & Comments)", "line", {
        "metrics": [
            {"expressionType": "SIMPLE", "column": {"column_name": "posts"}, "aggregate": "SUM", "label": "Posts"},
            {"expressionType": "SIMPLE", "column": {"column_name": "comments"}, "aggregate": "SUM", "label": "Comments"},
        ],
        "groupby": ["date"], "order_desc": False, "row_limit": 90,
        "line_interpolation": "linear", "show_legend": True,
        "x_axis_label": "Date", "y_axis_label": "Count",
        "time_range": "No filter",
    }); overview_charts.append(c)

    # User engagement
    c = C("forum_users", "Users by Role", "pie", {
        "metric": {"expressionType": "SQL", "sqlExpression": "COUNT(*)"},
        "groupby": ["role"], "row_limit": 10,
        "show_labels": True, "show_labels_threshold": 3,
        "time_range": "No filter",
    }); overview_charts.append(c)

    c = C("forum_users", "Users by Governorate (Tree)", "treemap", {
        "metrics": [{"expressionType": "SQL", "sqlExpression": "COUNT(*)"}],
        "groupby": ["governorate"], "row_limit": 15,
        "color_scheme": "supersetColors",
        "time_range": "No filter",
    }); overview_charts.append(c)

    c = C("wg_posts", "Most Engaging Posts", "table", {
        "metrics": [
            {"expressionType": "SIMPLE", "column": {"column_name": "engagement"}, "aggregate": "SUM", "label": "Engagement"},
            {"expressionType": "SIMPLE", "column": {"column_name": "likes_count"}, "aggregate": "SUM", "label": "Likes"},
        ],
        "groupby": ["title", "author_name", "category", "governorate"],
        "order_desc": True, "row_limit": 10,
        "show_cell_bars": True, "time_range": "No filter",
    }); overview_charts.append(c)

    overview_charts = [c for c in overview_charts if c]
    print(f"  → {len(overview_charts)} charts for Weather Overview")

    # ─── CHARTS: Risks & Alerts ─────────────────────────────────────

    print("\n  ── Dashboard: Risks & Alerts ──")
    risk_charts = []

    c = C("wg_risk", "Total Reports", "big_number_total", {
        "metric": {"expressionType": "SQL", "sqlExpression": "COUNT(DISTINCT CONCAT(report_type, id))"},
        "subheader": "All reports submitted", "y_axis_format": ",d",
        "time_range": "No filter",
    }); risk_charts.append(c)

    c = C("wg_risk", "Pending Reports", "big_number_total", {
        "metric": {"expressionType": "SQL", "sqlExpression":
            "SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)"},
        "subheader": "Awaiting review", "y_axis_format": ",d",
        "time_range": "No filter",
    }); risk_charts.append(c)

    c = C("wg_posts", "AI Moderation Rate", "big_number_total", {
        "metric": {"expressionType": "SQL", "sqlExpression":
            "ROUND(100.0 * SUM(CASE WHEN ai_approved THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1)"},
        "subheader": "Posts auto-approved by AI", "y_axis_format": ",.1f",
        "time_range": "No filter",
    }); risk_charts.append(c)

    c = C("wg_posts", "Risk Level Distribution", "pie", {
        "metric": {"expressionType": "SQL", "sqlExpression": "COUNT(DISTINCT id)"},
        "groupby": ["risk_level"], "row_limit": 10,
        "show_labels": True, "show_labels_threshold": 3,
        "color_scheme": "supersetColors",
        "time_range": "No filter",
    }); risk_charts.append(c)

    c = C("wg_risk", "Reports by Priority", "dist_bar", {
        "metrics": [{"expressionType": "SQL", "sqlExpression": "COUNT(DISTINCT CONCAT(report_type, id))"}],
        "groupby": ["priority"], "order_desc": True, "row_limit": 10,
        "color_scheme": "supersetColors", "show_bar_value": True,
        "time_range": "No filter",
    }); risk_charts.append(c)

    c = C("wg_risk", "Reports by Type", "pie", {
        "metric": {"expressionType": "SQL", "sqlExpression": "COUNT(DISTINCT CONCAT(report_type, id))"},
        "groupby": ["report_type"], "row_limit": 10,
        "show_labels": True, "show_labels_threshold": 3,
        "time_range": "No filter",
    }); risk_charts.append(c)

    c = C("wg_posts", "High Risk Posts (Red/Purple)", "table", {
        "metrics": [
            {"expressionType": "SIMPLE", "column": {"column_name": "likes_count"}, "aggregate": "SUM", "label": "Likes"},
        ],
        "groupby": ["title", "author_name", "governorate", "risk_level", "created_at"],
        "order_desc": True, "row_limit": 20,
        "show_cell_bars": True,
        "time_range": "No filter",
        "all_columns": [], "query_mode": "raw",
    }); risk_charts.append(c)

    c = C("wg_moderation", "Moderation Trend (90 days)", "line", {
        "metrics": [
            {"expressionType": "SIMPLE", "column": {"column_name": "total_posts"}, "aggregate": "SUM", "label": "Total"},
            {"expressionType": "SIMPLE", "column": {"column_name": "ai_approved"}, "aggregate": "SUM", "label": "AI Approved"},
            {"expressionType": "SIMPLE", "column": {"column_name": "pending"}, "aggregate": "SUM", "label": "Pending"},
        ],
        "groupby": ["date"], "order_desc": False, "row_limit": 90,
        "line_interpolation": "linear", "show_legend": True,
        "time_range": "No filter",
    }); risk_charts.append(c)

    c = C("wg_governorates", "High-Risk Posts by Governorate", "dist_bar", {
        "metrics": [{"expressionType": "SIMPLE", "column": {"column_name": "high_risk_posts"}, "aggregate": "SUM", "label": "High Risk Posts"}],
        "groupby": ["governorate"], "order_desc": True, "row_limit": 15,
        "color_scheme": "supersetColors", "show_bar_value": True,
        "time_range": "No filter",
    }); risk_charts.append(c)

    c = C("wg_risk", "Recent Pending Reports", "table", {
        "groupby": ["report_type", "reason", "priority", "priority_score", "related_title", "created_at"],
        "order_desc": True, "row_limit": 20,
        "show_cell_bars": True,
        "time_range": "No filter",
    }); risk_charts.append(c)

    risk_charts = [c for c in risk_charts if c]
    print(f"  → {len(risk_charts)} charts for Risks & Alerts")

    # ─── CHARTS: Scraping & News ─────────────────────────────────

    print("\n  ── Dashboard: Scraping & News ──")
    news_charts = []

    c = C("wg_news", "Total Articles", "big_number_total", {
        "metric": {"expressionType": "SQL", "sqlExpression": "COUNT(DISTINCT id)"},
        "subheader": "Articles scraped", "y_axis_format": ",d",
        "time_range": "No filter",
    }); news_charts.append(c)

    c = C("wg_news", "Articles by Source", "pie", {
        "metric": {"expressionType": "SQL", "sqlExpression": "COUNT(DISTINCT id)"},
        "groupby": ["source_name"], "row_limit": 10,
        "show_labels": True, "show_labels_threshold": 3,
        "color_scheme": "supersetColors",
        "time_range": "No filter",
    }); news_charts.append(c)

    c = C("wg_news", "Articles by Category", "dist_bar", {
        "metrics": [{"expressionType": "SQL", "sqlExpression": "COUNT(DISTINCT id)"}],
        "groupby": ["category"], "order_desc": True, "row_limit": 10,
        "color_scheme": "supersetColors", "show_bar_value": True,
        "time_range": "No filter",
    }); news_charts.append(c)

    c = C("wg_news", "Risk Level in News", "pie", {
        "metric": {"expressionType": "SQL", "sqlExpression": "COUNT(DISTINCT id)"},
        "groupby": ["risk_level"], "row_limit": 10,
        "show_labels": True, "show_labels_threshold": 3,
        "time_range": "No filter",
    }); news_charts.append(c)

    c = C("wg_news", "Articles Over Time", "line", {
        "metrics": [{"expressionType": "SQL", "sqlExpression": "COUNT(DISTINCT id)"}],
        "groupby": ["scraped_at"], "order_desc": False, "row_limit": 90,
        "line_interpolation": "linear", "show_legend": False,
        "x_axis_label": "Date", "y_axis_label": "Articles scraped",
        "time_range": "No filter",
    }); news_charts.append(c)

    c = C("wg_news", "Articles by Governorate", "treemap", {
        "metrics": [{"expressionType": "SQL", "sqlExpression": "COUNT(DISTINCT id)"}],
        "groupby": ["governorate"], "row_limit": 15,
        "color_scheme": "supersetColors",
        "time_range": "No filter",
    }); news_charts.append(c)

    c = C("wg_news", "Scraping Frequency by Source", "line", {
        "metrics": [{"expressionType": "SQL", "sqlExpression": "COUNT(DISTINCT id)"}],
        "groupby": ["source_name", "scraped_at"], "order_desc": False, "row_limit": 90,
        "line_interpolation": "linear", "show_legend": True,
        "time_range": "No filter",
    }); news_charts.append(c)

    c = C("wg_news", "Latest Articles", "table", {
        "groupby": ["source_name", "title", "category", "risk_level", "governorates", "published_at"],
        "order_desc": True, "row_limit": 15,
        "show_cell_bars": False, "page_length": 15,
        "time_range": "No filter",
        "align_pn": "left",
    }); news_charts.append(c)

    news_charts = [c for c in news_charts if c]
    print(f"  → {len(news_charts)} charts for Scraping & News")

    # ─── DASHBOARDS ──────────────────────────────────────────────

    print("\n[5] Creating dashboards...")

    dashboards = [
        ("🌤 Weather Overview", overview_charts),
        ("⚠️ Risks & Alerts", risk_charts),
        ("📰 Scraping & News", news_charts),
    ]

    for title, charts in dashboards:
        if not charts:
            print(f"  ⚠ No charts for '{title}', skipping")
            continue
        delete_dashboard(title)
        did = create_or_update_dashboard(title, charts)
        if did:
            layout_dashboard(did, charts, title)
            time.sleep(0.5)
            enable_embedding(did)

    # ─── SUMMARY ─────────────────────────────────────────────────

    print("\n" + "=" * 64)
    print("  ✅ SUPERSET INITIALIZATION COMPLETE")
    print("=" * 64)
    print("\n  Dashboards created:")
    for title, _ in dashboards:
        print(f"    • {title}")
    print("""
  Access:
    Superset UI : http://localhost:8088
    Login       : admin / admin123
    Embed via   : /superset-dashboard in your admin panel
    """)

if __name__ == "__main__":
    main()
