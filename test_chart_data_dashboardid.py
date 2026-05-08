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

# Test: POST with form_data containing dashboardId and slice_id
# Chart 49 (Total Users) uses datasource 7 (wg_quick_stats)
# Dashboard 2 contains chart 49
payload = {
    "datasource": {"id": 7, "type": "table"},
    "queries": [{
        "metrics": ["count"],
        "filters": [],
        "time_range": "No filter",
        "is_timeseries": False,
    }],
    "form_data": {
        "slice_id": 49,
        "dashboardId": 2,
        "datasource": "7__table",
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
print(f'POST /api/v1/chart/data (with dashboardId): {r.status_code}')
if r.status_code == 200:
    print('  SUCCESS!')
    result = r.json()
    for qr in result.get('queries', []):
        data = qr.get('data', [])
        print(f'  Rows: {len(data)}')
        if data:
            print(f'  First row: {json.dumps(data[0], indent=2)[:200]}')
else:
    print(f'  {json.dumps(r.json() if r.text.startswith("{") else r.text, indent=2)[:1000]}')
