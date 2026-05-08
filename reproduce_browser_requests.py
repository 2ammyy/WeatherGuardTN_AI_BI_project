import requests, json, urllib.parse

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
    'user': {'username':'admin','first_name':'Admin','last_name':''},
    'resources': [{'type':'dashboard','id':'2'}],
    'rls': [],
}, headers={'X-CSRFToken': csrf, 'Referer': f'{BASE}/'}, timeout=10)
guest_token = r.json()['token']

# Test 1: Exact GET request to explore_json (like browser)
# Browser sends: GET /superset/explore_json/?form_data={"slice_id":47}&dashboard_id=2
form_data_encoded = urllib.parse.quote('{"slice_id":47}')
url = f'{BASE}/superset/explore_json/?form_data={form_data_encoded}&dashboard_id=2'
print(f'URL: {url}')
r = requests.get(
    url,
    headers={'X-GuestToken': guest_token, 'Referer': f'{BASE}/'},
    timeout=30
)
print(f'Test 1 - GET explore_json: {r.status_code}')
try:
    print(f'  Body: {r.json()}')
except:
    print(f'  Body: {r.text[:500]}')

# Test 2: Exact GET request to chart/data (like browser)
# Browser sends: GET /api/v1/chart/data?form_data={"slice_id":49}&dashboard_id=2&force
form_data_encoded = urllib.parse.quote('{"slice_id":49}')
url = f'{BASE}/api/v1/chart/data?form_data={form_data_encoded}&dashboard_id=2&force'
print(f'\nURL: {url}')
r = requests.get(
    url,
    headers={'X-GuestToken': guest_token, 'Referer': f'{BASE}/'},
    timeout=30
)
print(f'Test 2 - GET chart/data: {r.status_code}')
try:
    print(f'  Body: {r.json()}')
except:
    print(f'  Body: {r.text[:500]}')
