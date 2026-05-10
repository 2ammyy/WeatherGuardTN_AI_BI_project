import requests, json

BASE = 'http://superset:8088'
s = requests.Session()

# Login as admin
r = s.post(f'{BASE}/api/v1/security/login', json={'username':'admin','password':'admin123','provider':'db','refresh':True}, timeout=10)
r.raise_for_status()
token = r.json()['access_token']
s.headers['Authorization'] = f'Bearer {token}'

r = s.get(f'{BASE}/api/v1/security/csrf_token', timeout=10)
r.raise_for_status()
csrf = r.json()['result']
s.headers['X-CSRFToken'] = csrf
s.headers['Referer'] = f'{BASE}/'

# First get a guest token
r = s.post(f'{BASE}/api/v1/security/guest_token/', json={
    "user": {"username": "admin", "first_name": "Admin", "last_name": ""},
    "resources": [{"type": "dashboard", "id": "2"}],
    "rls": [],
}, timeout=10)
print(f'Guest token status: {r.status_code}')
if r.status_code != 200:
    print(r.text[:500])
    exit()

guest_token = r.json()['token']

# Now try the chart data endpoint with guest token
headers = {
    'X-GuestToken': guest_token,
    'Content-Type': 'application/json',
    'Referer': f'{BASE}/',
}

# Test 1: chart/data endpoint
r = requests.post(
    f'{BASE}/api/v1/chart/data',
    params={'form_data': json.dumps({"slice_id": 49}), 'dashboard_id': '2', 'force': ''},
    headers=headers,
    timeout=10
)
print(f'\nChart data (slice 49) status: {r.status_code}')
if r.status_code != 200:
    try:
        print(f'Response: {r.json()}')
    except:
        print(f'Response text: {r.text[:300]}')

# Test 2: chart/49 endpoint
r = requests.get(
    f'{BASE}/api/v1/chart/49',
    headers=headers,
    timeout=10
)
print(f'\nChart 49 status: {r.status_code}')
if r.status_code != 200:
    try:
        print(f'Response: {r.json()}')
    except:
        print(f'Response text: {r.text[:300]}')
