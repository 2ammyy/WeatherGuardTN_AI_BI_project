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

# Get dashboard charts
r = requests.get(
    f'{BASE}/api/v1/dashboard/2/charts',
    headers={'X-GuestToken': guest_token, 'Referer': f'{BASE}/'},
    timeout=10
)
charts = r.json().get('result', [])
print(f'Dashboard has {len(charts)} charts\n')

# For each chart, try to get chart data
success = 0
fail = 0
for chart in charts:
    cid = chart['id']
    print(f'Chart {cid} ({chart["slice_name"]}):')
    
    # First, get chart details (may fail with 404, that's OK)
    r = requests.get(
        f'{BASE}/api/v1/chart/{cid}',
        headers={'X-GuestToken': guest_token, 'Referer': f'{BASE}/'},
        timeout=10
    )
    if r.status_code == 200:
        print(f'  GET chart/{cid}: 200 OK')
        form_data_str = r.json().get('result', {}).get('form_data', '{}')
        if isinstance(form_data_str, str):
            form_data = json.loads(form_data_str) if form_data_str else {}
        else:
            form_data = form_data_str
    else:
        print(f'  GET chart/{cid}: {r.status_code} (may be normal in some cases)')
        form_data = {}

    # Try chart data endpoint with dashboardId
    payload = {
        "datasource": {"id": chart.get('datasource_id'), "type": chart.get('datasource_type', 'table')},
        "queries": [{
            "metrics": None,
            "filters": [],
            "time_range": "No filter",
            "is_timeseries": False,
        }],
        "form_data": {
            "slice_id": cid,
            "dashboardId": 2,
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
        print(f'  POST chart/data: 200 OK ({total_rows} rows)')
    else:
        fail += 1
        try:
            err = r.json()
            msg = err.get('errors', [{}])[0].get('message', r.text[:200])
        except:
            msg = r.text[:200]
        print(f'  POST chart/data: {r.status_code} - {msg}')

print(f'\nTotal: {success} succeeded, {fail} failed')
