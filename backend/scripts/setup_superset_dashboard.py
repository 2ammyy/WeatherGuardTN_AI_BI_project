"""
Setup Superset dashboards for WeatherGuardTN.
Runs inside the superset container. Uses Superset REST API.
"""
import requests
import json
import sys
import time

from datetime import datetime

BASE = "http://localhost:8088"

# ── Helpers ──────────────────────────────────────────────────────────

def api(method, path, token=None, raw=False, **kwargs):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = getattr(requests, method)(f"{BASE}{path}", headers=headers, **kwargs)
    if raw:
        return r
    try:
        return r.json()
    except Exception:
        print(f"  ⚠ {method.upper()} {path} → {r.status_code} (non-JSON)")
        return r.text


def login():
    r = api("post", "/api/v1/security/login", json={
        "username": "admin",
        "password": "admin123",
        "provider": "db",
        "refresh": True,
    })
    return r["access_token"]


def get_or_create_database(token):
    dbs = api("get", "/api/v1/database/", token=token)
    for db in dbs.get("result", []):
        if db["database_name"] == "WeatherGuardTN":
            print(f"  Using existing database (id={db['id']})")
            return db["id"]
    result = api("post", "/api/v1/database/", token=token, json={
        "database_name": "WeatherGuardTN",
        "sqlalchemy_uri": "postgresql://weatheruser:weatherpass@db:5432/weatherguard",
        "expose_in_sqllab": True,
        "allow_dml": False,
    })
    db_id = result["id"]
    print(f"  Created database (id={db_id})")
    return db_id


def find_dataset(token, name):
    result = api("get", f"/api/v1/dataset/?q=(filters:!((col:table_name,opr:eq,value:{name})))", token=token)
    if result.get("count", 0) > 0:
        return result["result"][0]
    return None


def create_virtual_dataset(token, db_id, name, sql):
    existing = find_dataset(token, name)
    if existing:
        print(f"  Dataset '{name}' already exists (id={existing['id']})")
        return existing["id"]

    r = api("post", "/api/v1/dataset/", token=token, json={
        "database": db_id,
        "schema": "public",
        "table_name": name,
        "sql": sql,
    })
    if "id" in r:
        ds_id = r["id"]
        print(f"  Created dataset '{name}' (id={ds_id})")
        # Trigger column refresh
        time.sleep(1)
        api("put", f"/api/v1/dataset/{ds_id}", token=token, json={})
        return ds_id
    else:
        print(f"  ERROR creating dataset '{name}': {r}")
        return None


def find_chart(token, name):
    result = api("get", f"/api/v1/chart/?q=(filters:!((col:slice_name,opr:eq,value:{name})))", token=token)
    if result.get("count", 0) > 0:
        return result["result"][0]
    return None


def create_chart(token, dataset_id, name, viz_type, params, dataset_name=None):
    existing = find_chart(token, name)
    if existing:
        print(f"  Chart '{name}' already exists (id={existing['id']})")
        return existing["id"]

    payload = {
        "datasource_id": dataset_id,
        "datasource_type": "table",
        "slice_name": name,
        "viz_type": viz_type,
        "params": json.dumps(params),
        "query_context_generation": False,
    }
    if dataset_name:
        payload["datasource_name"] = dataset_name

    r = api("post", "/api/v1/chart/", token=token, json=payload)
    if "id" in r:
        chart_id = r["id"]
        print(f"  Created chart '{name}' (id={chart_id})")
        return chart_id
    else:
        print(f"  ERROR creating chart '{name}': {r}")
        return None


def find_dashboard(token, name):
    result = api("get", f"/api/v1/dashboard/?q=(filters:!((col:dashboard_title,opr:eq,value:{name})))", token=token)
    if result.get("count", 0) > 0:
        return result["result"][0]
    return None


def create_dashboard(token, title, chart_ids):
    existing = find_dashboard(token, title)
    if existing:
        print(f"  Dashboard '{title}' already exists (id={existing['id']})")
        dash_id = existing["id"]
        # Update with new charts
        _update_dashboard_charts(token, dash_id, chart_ids)
        return existing["id"], existing.get("url", f"/superset/dashboard/{existing['id']}/")

    payload = {
        "dashboard_title": title,
        "slug": f"weatherguard-{datetime.now().strftime('%Y%m%d%H%M')}",
        "published": True,
    }

    r = api("post", "/api/v1/dashboard/", token=token, json=payload)
    if "id" in r:
        dash_id = r["id"]
        url = r.get("url", f"/superset/dashboard/{dash_id}/")
        print(f"  Created dashboard (id={dash_id})")
        _update_dashboard_charts(token, dash_id, chart_ids)
        return dash_id, url
    else:
        print(f"  ERROR creating dashboard '{title}': {r}")
        return None, None


def _update_dashboard_charts(token, dash_id, chart_ids):
    """Update dashboard with chart positions via position_json."""
    time.sleep(1)

    # Fetch chart names
    charts_info = {}
    for cid in chart_ids:
        r = api("get", f"/api/v1/chart/{cid}", token=token)
        if isinstance(r, dict) and "result" in r:
            charts_info[cid] = r["result"].get("slice_name", f"Chart {cid}")

    # Build position_json
    chart_entries = {}
    grid_children = []
    cols = 4  # 3 charts per row (12/4=3)
    positions = [
        (0, 0, 6, 3),   # Total Users - big number, half width
        (6, 0, 6, 3),   # Total Posts - big number
        (0, 3, 4, 4),   # Top Users - 1/3 width
        (4, 3, 4, 4),   # Top Posts - 1/3 width
        (8, 3, 4, 4),   # Top Engaged - 1/3 width
        (0, 7, 6, 4),   # Users by Governorate bar
        (6, 7, 6, 4),   # Posts by Category pie
        (0, 11, 4, 4),  # Reports by Priority
        (4, 11, 4, 4),  # User Registrations line
        (8, 11, 4, 4),  # Daily Posts line
        (0, 15, 6, 3),  # Risk Distribution
        (6, 15, 3, 3),  # Total Comments
        (9, 15, 3, 3),  # Banned Users
    ]

    for i, (cid, name) in enumerate(charts_info.items()):
        if i < len(positions):
            x, y, w, h = positions[i]
        else:
            x, y, w, h = ((i % 3) * 4, 18 + (i // 3) * 4, 4, 4)
        cid_str = f"CHART-{i}"
        chart_entries[cid_str] = {
            "type": "CHART",
            "id": cid_str,
            "children": [],
            "meta": {
                "chartId": cid,
                "width": w,
                "height": h,
                "sliceName": name,
            },
            "parents": ["ROOT_ID", f"GRID_ID"],
        }
        grid_children.append(cid_str)

    position_json = json.dumps({
        "ROOT_ID": {
            "type": "ROOT",
            "id": "ROOT_ID",
            "children": ["GRID_ID"],
            "parents": [],
        },
        "GRID_ID": {
            "type": "GRID_CONTAINER",
            "id": "GRID_ID",
            "children": grid_children,
            "parents": ["ROOT_ID"],
        },
        "HEADER_ID": {
            "type": "HEADER",
            "id": "HEADER_ID",
            "meta": {"text": "WeatherGuardTN Analytics"},
        },
        **chart_entries,
    })

    payload = {
        "position_json": position_json,
        "json_metadata": json.dumps({
            "show_native_filters": True,
            "color_scheme": None,
        }),
    }

    r = api("put", f"/api/v1/dashboard/{dash_id}", token=token, json=payload)
    if "id" in r:
        print(f"  Added {len(chart_ids)} charts to dashboard")
        # Republish
        api("put", f"/api/v1/dashboard/{dash_id}", token=token, json={"published": True})
    else:
        print(f"  ⚠ Error updating dashboard charts: {r}")


# ── Main ─────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("WeatherGuardTN — Superset Dashboard Setup")
    print("=" * 60)

    # 1. Login
    print("\n[1] Authenticating...")
    try:
        token = login()
        print("  ✅ Logged in")
    except Exception as e:
        print(f"  ❌ Login failed: {e}")
        sys.exit(1)

    # 2. Database
    print("\n[2] Setting up database connection...")
    try:
        db_id = get_or_create_database(token)
    except Exception as e:
        print(f"  ❌ Database setup failed: {e}")
        sys.exit(1)

    # 3. Datasets
    print("\n[3] Creating datasets...")

    datasets_config = [
        {
            "name": "wg_users_governorates",
            "sql": "SELECT governorate, COUNT(*) as user_count FROM forum_users WHERE governorate IS NOT NULL AND governorate != '' GROUP BY governorate ORDER BY user_count DESC",
        },
        {
            "name": "wg_posts_governorates",
            "sql": "SELECT governorate, COUNT(*) as post_count FROM forum_posts WHERE is_deleted = false AND governorate IS NOT NULL AND governorate != '' GROUP BY governorate ORDER BY post_count DESC",
        },
        {
            "name": "wg_posts_engagement",
            "sql": "SELECT id, title, governorate, category, likes_count, comments_count, shares_count, (likes_count + comments_count + shares_count) as engagement, created_at FROM forum_posts WHERE is_deleted = false ORDER BY engagement DESC LIMIT 5",
        },
        {
            "name": "wg_posts_categories",
            "sql": "SELECT category, COUNT(*) as post_count FROM forum_posts WHERE is_deleted = false AND category IS NOT NULL AND category != '' GROUP BY category ORDER BY post_count DESC",
        },
        {
            "name": "wg_reports_priority",
            "sql": "SELECT 'Post Reports' as source, priority, COUNT(*) as cnt FROM post_reports GROUP BY priority UNION ALL SELECT 'Comment Reports' as source, priority, COUNT(*) as cnt FROM comment_reports GROUP BY priority UNION ALL SELECT 'User Reports' as source, priority, COUNT(*) as cnt FROM user_reports GROUP BY priority ORDER BY source, priority",
        },
        {
            "name": "wg_user_registrations",
            "sql": "SELECT DATE(created_at) as reg_date, COUNT(*) as new_users FROM forum_users GROUP BY DATE(created_at) ORDER BY reg_date",
        },
        {
            "name": "wg_quick_stats",
            "sql": "SELECT (SELECT COUNT(*) FROM forum_users) as total_users, (SELECT COUNT(*) FROM forum_posts WHERE is_deleted = false) as total_posts, (SELECT COUNT(*) FROM forum_comments WHERE is_deleted = false) as total_comments, (SELECT COUNT(*) FROM forum_users WHERE is_banned = true) as banned_users",
        },
        {
            "name": "wg_daily_posts",
            "sql": "SELECT DATE(created_at) as post_date, COUNT(*) as post_count FROM forum_posts WHERE is_deleted = false GROUP BY DATE(created_at) ORDER BY post_date",
        },
        {
            "name": "wg_risk_distribution",
            "sql": "SELECT risk_level, COUNT(*) as cnt FROM forum_posts WHERE is_deleted = false AND risk_level IS NOT NULL GROUP BY risk_level ORDER BY cnt DESC",
        },
    ]

    dataset_ids = {}
    for ds in datasets_config:
        did = create_virtual_dataset(token, db_id, ds["name"], ds["sql"])
        if did:
            dataset_ids[ds["name"]] = did

    # 4. Charts
    print("\n[4] Creating charts...")

    chart_ids = []

    # Users per governorate (table)
    cid = create_chart(token, dataset_ids["wg_users_governorates"],
        "Top Governorates (Users)", "table",
        {
            "metrics": [{"expressionType": "SIMPLE", "column": {"column_name": "user_count"}, "aggregate": "SUM", "label": "Users"}],
            "groupby": ["governorate"],
            "order_desc": True,
            "row_limit": 10,
            "include_time": False,
            "show_cell_bars": True,
            "time_range": "No filter",
        })
    if cid: chart_ids.append(cid)

    # Posts per governorate (table)
    cid = create_chart(token, dataset_ids["wg_posts_governorates"],
        "Top Governorates (Posts)", "table",
        {
            "metrics": [{"expressionType": "SIMPLE", "column": {"column_name": "post_count"}, "aggregate": "SUM", "label": "Posts"}],
            "groupby": ["governorate"],
            "order_desc": True,
            "row_limit": 10,
            "include_time": False,
            "show_cell_bars": True,
            "time_range": "No filter",
        })
    if cid: chart_ids.append(cid)

    # Top 5 engaged posts (table)
    cid = create_chart(token, dataset_ids["wg_posts_engagement"],
        "Top 5 Engaged Posts", "table",
        {
            "metrics": [
                {"expressionType": "SIMPLE", "column": {"column_name": "likes_count"}, "aggregate": "SUM", "label": "Likes"},
                {"expressionType": "SIMPLE", "column": {"column_name": "comments_count"}, "aggregate": "SUM", "label": "Comments"},
                {"expressionType": "SIMPLE", "column": {"column_name": "engagement"}, "aggregate": "SUM", "label": "Total Engagement"},
            ],
            "groupby": ["title", "category"],
            "order_desc": True,
            "row_limit": 5,
            "include_time": False,
            "show_cell_bars": True,
            "time_range": "No filter",
        })
    if cid: chart_ids.append(cid)

    # Users per governorate (bar)
    cid = create_chart(token, dataset_ids["wg_users_governorates"],
        "Users Distribution by Governorate", "dist_bar",
        {
            "metrics": [{"expressionType": "SIMPLE", "column": {"column_name": "user_count"}, "aggregate": "SUM", "label": "Users"}],
            "groupby": ["governorate"],
            "order_desc": True,
            "row_limit": 10,
            "color_scheme": "supersetColors",
            "time_range": "No filter",
        })
    if cid: chart_ids.append(cid)

    # Posts per category (pie)
    cid = create_chart(token, dataset_ids["wg_posts_categories"],
        "Posts by Category", "pie",
        {
            "metric": {"expressionType": "SIMPLE", "column": {"column_name": "post_count"}, "aggregate": "SUM", "label": "Posts"},
            "groupby": ["category"],
            "row_limit": 10,
            "time_range": "No filter",
        })
    if cid: chart_ids.append(cid)

    # Reports by priority (bar)
    cid = create_chart(token, dataset_ids["wg_reports_priority"],
        "Reports by Priority", "dist_bar",
        {
            "metrics": [{"expressionType": "SIMPLE", "column": {"column_name": "cnt"}, "aggregate": "SUM", "label": "Count"}],
            "groupby": ["source", "priority"],
            "order_desc": True,
            "row_limit": 20,
            "color_scheme": "supersetColors",
            "time_range": "No filter",
        })
    if cid: chart_ids.append(cid)

    # User registrations over time (line)
    cid = create_chart(token, dataset_ids["wg_user_registrations"],
        "User Registrations Over Time", "line",
        {
            "metrics": [{"expressionType": "SIMPLE", "column": {"column_name": "new_users"}, "aggregate": "SUM", "label": "New Users"}],
            "groupby": ["reg_date"],
            "order_desc": True,
            "row_limit": 100,
            "time_range": "No filter",
            "line_interpolation": "linear",
            "color_scheme": "supersetColors",
        })
    if cid: chart_ids.append(cid)

    # Daily posts (line)
    cid = create_chart(token, dataset_ids["wg_daily_posts"],
        "Daily Post Volume", "line",
        {
            "metrics": [{"expressionType": "SIMPLE", "column": {"column_name": "post_count"}, "aggregate": "SUM", "label": "Posts"}],
            "groupby": ["post_date"],
            "order_desc": True,
            "row_limit": 100,
            "time_range": "No filter",
            "line_interpolation": "linear",
            "color_scheme": "supersetColors",
        })
    if cid: chart_ids.append(cid)

    # Risk distribution (bar)
    cid = create_chart(token, dataset_ids["wg_risk_distribution"],
        "Post Risk Level Distribution", "dist_bar",
        {
            "metrics": [{"expressionType": "SIMPLE", "column": {"column_name": "cnt"}, "aggregate": "SUM", "label": "Posts"}],
            "groupby": ["risk_level"],
            "order_desc": True,
            "row_limit": 10,
            "color_scheme": "supersetColors",
            "time_range": "No filter",
        })
    if cid: chart_ids.append(cid)

    # Quick stats - use 4 big number charts from the quick_stats dataset
    big_number_configs = [
        ("Total Users", "total_users"),
        ("Total Posts", "total_posts"),
        ("Total Comments", "total_comments"),
        ("Banned Users", "banned_users"),
    ]
    for label, col in big_number_configs:
        cid = create_chart(token, dataset_ids["wg_quick_stats"],
            label, "big_number",
            {
                "metric": {"expressionType": "SIMPLE", "column": {"column_name": col}, "aggregate": "SUM", "label": label},
                "compare_lag": None,
                "subheader": "",
                "y_axis_format": ",d",
                "time_range": "No filter",
            })
        if cid: chart_ids.append(cid)

    print(f"\n  Total charts created/found: {len(chart_ids)}")

    # 5. Dashboard
    print("\n[5] Creating dashboard...")

    # Remove any existing dashboards
    for slug_attempt in ["weatherguardtn-analytics", "weatherguardtn-analytics-2"]:
        existing = find_dashboard(token, "WeatherGuardTN Analytics")
        if not existing:
            existing = find_dashboard(token, "WeatherGuardTN Analytics v2")
        if existing:
            api("delete", f"/api/v1/dashboard/{existing['id']}", token=token)
            print("  Removed existing dashboard")
            time.sleep(1)

    dash_id, dash_url = create_dashboard(token, "WeatherGuardTN Analytics", chart_ids)

    # 6. Summary
    print("\n" + "=" * 60)
    print("DASHBOARD SETUP COMPLETE")
    print("=" * 60)
    if dash_url:
        print(f"\n  Dashboard URL: {BASE}{dash_url}")
        print(f"  Embed URL:     {BASE}{dash_url}?standalone=true&show_filters=false")
    print("")


if __name__ == "__main__":
    main()
