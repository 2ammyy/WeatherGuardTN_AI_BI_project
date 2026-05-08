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

# Test 1: chart/data with admin Bearer token
r = requests.post(
    f'{BASE}/api/v1/chart/data',
    params={'form_data': json.dumps({"slice_id": 49}), 'dashboard_id': '2'},
    headers={'Authorization': f'Bearer {token}', 'X-CSRFToken': csrf, 'Referer': f'{BASE}/'},
    timeout=10
)
print(f'Chart data (slice 49) with Bearer: {r.status_code}')
if r.status_code != 200:
    try:
        print(f'Response: {r.json()}')
    except:
        print(f'Response text: {r.text[:300]}')
else:
    print('Success!')

# Test 2: chart/49 with Bearer
r = requests.get(
    f'{BASE}/api/v1/chart/49',
    headers={'Authorization': f'Bearer {token}', 'X-CSRFToken': csrf, 'Referer': f'{BASE}/'},
    timeout=10
)
print(f'\nChart 49 with Bearer: {r.status_code}')
if r.status_code != 200:
    try:
        print(f'Response: {r.json()}')
    except:
        print(f'Response text: {r.text[:300]}')
else:
    print('Success!')

# Test 3: chart/data with POST body
r = requests.post(
    f'{BASE}/api/v1/chart/data',
    json={"form_data": {"slice_id": 49}},
    headers={'Authorization': f'Bearer {token}', 'X-CSRFToken': csrf, 'Referer': f'{BASE}/'},
    timeout=10
)
print(f'\nChart data (slice 49) with JSON body: {r.status_code}')
if r.status_code != 200:
    try:
        print(f'Response: {r.json()}')
    except:
        print(f'Response text: {r.text[:300]}')
else:
    print('Success!')
