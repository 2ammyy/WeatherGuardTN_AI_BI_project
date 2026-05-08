import requests, json

BASE = 'http://superset:8088'
s = requests.Session()

r = s.post(f'{BASE}/api/v1/security/login', json={'username':'admin','password':'admin123','provider':'db','refresh':True}, timeout=10)
r.raise_for_status()
token = r.json()['access_token']
s.headers['Authorization'] = f'Bearer {token}'

# Get CSRF token
r = s.get(f'{BASE}/api/v1/security/csrf_token', timeout=10)
r.raise_for_status()
csrf = r.json()['result']

r = s.post(f'{BASE}/api/v1/security/guest_token/', json={
    "user": {"username": "admin", "first_name": "Admin", "last_name": ""},
    "resources": [{"type": "dashboard", "id": "2"}],
    "rls": [],
}, headers={'X-CSRFToken': csrf, 'Referer': f'{BASE}/'}, timeout=10)
guest_token = r.json()['token']

# First, get chart 40 form_data to use in data query
r = requests.get(
    f'{BASE}/api/v1/chart/40',
    headers={'Authorization': f'Bearer {token}', 'Referer': f'{BASE}/'},
    timeout=10
)
chart40 = r.json().get('result', {})
form_data = chart40.get('form_data', {})
if isinstance(form_data, str):
    form_data = json.loads(form_data)
print(f'Chart 40 form_data: {json.dumps(form_data, indent=2)[:300]}')

# Try POST /api/v1/chart/data with proper payload
payload = {
    "datasource": {"id": form_data.get('datasource_id', 1), "type": form_data.get('datasource_type', 'table')},
    "queries": [{
        "granularity": form_data.get('granularity', 'day'),
        "groupby": form_data.get('groupby', []),
        "metrics": form_data.get('metrics', []),
        "filters": form_data.get('filters', []),
        "time_range": form_data.get('time_range', 'No filter'),
        "is_timeseries": True,
    }],
    "form_data": form_data,
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
print(f'\nPOST /api/v1/chart/data status: {r.status_code}')
if r.status_code == 200:
    print('  SUCCESS!')
    result = r.json()
    print(f'  Keys: {list(result.keys())}')
    if 'result' in result:
        print(f'  Rows: {len(result.get("result", []))}')
elif r.status_code == 500:
    print(f'  Response: {r.text[:500]}')
else:
    print(f'  Response: {json.dumps(r.json(), indent=2)[:500]}')
