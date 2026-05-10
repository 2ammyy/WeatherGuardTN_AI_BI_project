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

# Test 1: GET chart/40 with guest token (was 404)
r = requests.get(
    f'{BASE}/api/v1/chart/40',
    headers={'X-GuestToken': guest_token, 'Referer': f'{BASE}/'},
    timeout=10
)
print(f'Test 1 - GET chart/40: {r.status_code}')

# Test 2: GET chart/ list with guest token
r = requests.get(
    f'{BASE}/api/v1/chart/',
    headers={'X-GuestToken': guest_token, 'Referer': f'{BASE}/'},
    params={'q': '(page_size:100)'},
    timeout=10
)
if r.status_code == 200:
    charts = r.json().get('result', [])
    print(f'Test 2 - GET chart/: {r.status_code}, {len(charts)} charts')
else:
    print(f'Test 2 - GET chart/: {r.status_code}')

# Test 3: POST chart/data WITHOUT dashboardId (the guest bypass won't work, but datasource_access should)
r = requests.post(
    f'{BASE}/api/v1/chart/data',
    json={
        "datasource": {"id": 7, "type": "table"},
        "queries": [{"metrics": ["count"], "filters": [], "time_range": "No filter"}],
        "form_data": {"slice_id": 49, "datasource": "7__table"},
        "force": False, "result_format": "json", "result_type": "full"
    },
    headers={'X-GuestToken': guest_token, 'Referer': f'{BASE}/'},
    timeout=30
)
print(f'Test 3 - POST chart/data (no dashboardId): {r.status_code}')
if r.status_code != 200:
    print(f'  {r.text[:500]}')

# Test 4: POST chart/data WITH dashboardId (should also work)
r = requests.post(
    f'{BASE}/api/v1/chart/data',
    json={
        "datasource": {"id": 7, "type": "table"},
        "queries": [{"metrics": ["count"], "filters": [], "time_range": "No filter"}],
        "form_data": {"slice_id": 49, "dashboardId": 2, "datasource": "7__table"},
        "force": False, "result_format": "json", "result_type": "full"
    },
    headers={'X-GuestToken': guest_token, 'Referer': f'{BASE}/'},
    timeout=30
)
print(f'Test 4 - POST chart/data (with dashboardId): {r.status_code}')
if r.status_code != 200:
    print(f'  {r.text[:500]}')
