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

r = s.post(f'{BASE}/api/v1/security/guest_token/', json={
    "user": {"username": "admin", "first_name": "Admin", "last_name": ""},
    "resources": [{"type": "dashboard", "id": "2"}],
    "rls": [],
}, headers={'X-CSRFToken': csrf, 'Referer': f'{BASE}/'}, timeout=10)
guest_token = r.json()['token']

# Test 1: GET chart/40 with guest token
r = requests.get(
    f'{BASE}/api/v1/chart/40',
    headers={'X-GuestToken': guest_token, 'Referer': f'{BASE}/'},
    timeout=10
)
print(f'Test 1 - GET chart/40, guest token: {r.status_code}')
if r.status_code != 200:
    print(f'  {r.text[:300]}')

# Test 2: GET chart/40 with Bearer
r = requests.get(
    f'{BASE}/api/v1/chart/40',
    headers={'Authorization': f'Bearer {token}', 'Referer': f'{BASE}/'},
    timeout=10
)
print(f'\nTest 2 - GET chart/40, Bearer: {r.status_code}')
if r.status_code != 200:
    print(f'  {r.text[:300]}')

# Test 3: chart/data with guest token
r = requests.post(
    f'{BASE}/api/v1/chart/data',
    json={"form_data": {"slice_id": 49}},
    headers={'X-GuestToken': guest_token, 'Content-Type': 'application/json', 'Referer': f'{BASE}/'},
    timeout=10
)
print(f'\nTest 3 - POST chart/data, guest token: {r.status_code}')
if r.status_code != 200:
    print(f'  {r.text[:300]}')

# Test 4: chart/data with Bearer
r = requests.post(
    f'{BASE}/api/v1/chart/data',
    json={"form_data": {"slice_id": 49}},
    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json', 'Referer': f'{BASE}/'},
    timeout=10
)
print(f'\nTest 4 - POST chart/data, Bearer: {r.status_code}')
if r.status_code != 200:
    print(f'  {r.text[:300]}')
