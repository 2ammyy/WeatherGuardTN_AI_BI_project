import requests, json

BASE = 'http://superset:8088'
s = requests.Session()

r = s.post(f'{BASE}/api/v1/security/login', json={'username':'admin','password':'admin123','provider':'db','refresh':True}, timeout=10)
r.raise_for_status()
token = r.json()['access_token']
s.headers['Authorization'] = f'Bearer {token}'

r = s.get(f'{BASE}/api/v1/security/csrf_token', timeout=10)
r.raise_for_status()
csrf = r.json()['result']

r = s.post(f'{BASE}/api/v1/security/guest_token/', json={
    "user": {"username": "admin", "first_name": "Admin", "last_name": ""},
    "resources": [{"type": "dashboard", "id": "2"}],
    "rls": [],
}, headers={'X-CSRFToken': csrf, 'Referer': f'{BASE}/'}, timeout=10)
guest_token = r.json()['token']

# Get all charts to get datasource_id
r = requests.get(
    f'{BASE}/api/v1/chart/',
    params={'q': '(page_size:100)'},
    headers={'X-GuestToken': guest_token, 'Referer': f'{BASE}/'},
    timeout=10
)
all_charts = {c['id']: c for c in r.json().get('result', [])}
print(f'Total charts from /api/v1/chart/: {len(all_charts)}')

# Get dashboard charts
r = requests.get(
    f'{BASE}/api/v1/dashboard/2/charts',
    headers={'X-GuestToken': guest_token, 'Referer': f'{BASE}/'},
    timeout=10
)
dashboard_chart_ids = [c['id'] for c in r.json().get('result', [])]
print(f'Dashboard has {len(dashboard_chart_ids)} charts\n')

success = 0
fail = 0
for cid in dashboard_chart_ids:
    chart_info = all_charts.get(cid, {})
    slice_name = chart_info.get('slice_name', 'Unknown')
    ds_id = chart_info.get('datasource_id')
    ds_type = chart_info.get('datasource_type', 'table')
    
    if ds_id is None:
        print(f'Chart {cid} ({slice_name}): No datasource_id - SKIP')
        fail += 1
        continue
        
    print(f'Chart {cid} ({slice_name}): datasource_id={ds_id}, type={ds_type}')
    
    payload = {
        "datasource": {"id": ds_id, "type": ds_type},
        "queries": [{
            "metrics": None,
            "filters": [],
            "time_range": "No filter",
            "is_timeseries": False,
        }],
        "form_data": {
            "slice_id": cid,
            "dashboardId": 2,
            "datasource": f"{ds_id}__{ds_type}",
        },
        "force": False,
        "result_format": "json",
        "result_type": "full"
    }
    
    r = requests.post(
        f'{BASE}/api/v1/chart/data',
        json=payload,
        headers={'X-GuestToken': guest_token, 'Referer': f'{BASE}/'},
        timeout=30
    )
    
    if r.status_code == 200:
        success += 1
        queries = r.json().get('queries', [])
        total_rows = sum(len(q.get('data', [])) for q in queries)
        print(f'  -> {r.status_code} OK ({total_rows} rows)')
    else:
        fail += 1
        try:
            err = r.json()
            msg = err.get('message') or err.get('errors', [{}])[0].get('message', str(err)[:200])
        except:
            msg = r.text[:200]
        print(f'  -> {r.status_code}: {msg[:200]}')

print(f'\nTotal: {success} succeeded, {fail} failed')
