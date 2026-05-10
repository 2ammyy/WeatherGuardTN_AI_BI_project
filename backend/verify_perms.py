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

# Test 1: GET chart/46 with guest token (was 404)
r = requests.get(
    f'{BASE}/api/v1/chart/46',
    headers={'X-GuestToken': guest_token, 'Referer': f'{BASE}/'},
    timeout=10
)
print(f'Test 1 - GET chart/46, guest token: {r.status_code}')
if r.status_code != 200:
    print(f'  {r.text[:300]}')

# Test 2: GET chart/40 with guest token
r = requests.get(
    f'{BASE}/api/v1/chart/40',
    headers={'X-GuestToken': guest_token, 'Referer': f'{BASE}/'},
    timeout=10
)
print(f'\nTest 2 - GET chart/40, guest token: {r.status_code}')
if r.status_code != 200:
    print(f'  {r.text[:300]}')

# Test 3: POST chart/data with guest token (JSON body)
r = requests.post(
    f'{BASE}/api/v1/chart/data',
    json={"form_data": {"slice_id": 49}},
    headers={'X-GuestToken': guest_token, 'Referer': f'{BASE}/'},
    timeout=10
)
print(f'\nTest 3 - POST chart/data (JSON body), guest token: {r.status_code}')
if r.status_code != 200:
    print(f'  {r.text[:500]}')

# Test 4: POST chart/data with query params + JSON body (like browser SDK might send)
r = requests.post(
    f'{BASE}/api/v1/chart/data?form_data=' + json.dumps({"slice_id": 49}),
    json={"form_data": {"slice_id": 49}},
    headers={'X-GuestToken': guest_token, 'Referer': f'{BASE}/'},
    timeout=10
)
print(f'\nTest 4 - POST chart/data (query+json), guest token: {r.status_code}')
if r.status_code != 200:
    print(f'  {r.text[:500]}')

# Test 5: superset/explore_json with guest token
r = requests.post(
    f'{BASE}/superset/explore_json/',
    json={"form_data": {"slice_id": 49}},
    headers={'X-GuestToken': guest_token, 'Referer': f'{BASE}/'},
    timeout=10
)
print(f'\nTest 5 - POST superset/explore_json, guest token: {r.status_code}')
if r.status_code != 200:
    print(f'  {r.text[:300]}')

# Test 6: GET chart//list with guest token (used by dashboard to list charts)
r = requests.get(
    f'{BASE}/api/v1/chart/',
    params={'q': '(page_size:100)'},
    headers={'X-GuestToken': guest_token, 'Referer': f'{BASE}/'},
    timeout=10
)
print(f'\nTest 6 - GET chart/, guest token: {r.status_code}')
if r.status_code != 200:
    print(f'  {r.text[:300]}')
