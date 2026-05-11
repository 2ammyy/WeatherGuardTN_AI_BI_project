import requests

BASE = 'http://localhost:8088'

# 1. Login as admin
s = requests.Session()
r = s.post(f'{BASE}/api/v1/security/login', json={'username':'admin','password':'admin123','provider':'db','refresh':True}, timeout=10)
s.headers.update({'Authorization': 'Bearer '+r.json()['access_token']})
s.headers['Referer'] = f'{BASE}/'

# 2. Get dashboards
r = s.get(f'{BASE}/api/v1/dashboard/?q=(page_size:5)', timeout=10)
dashboards = r.json().get('result', [])
dash_id = str(dashboards[0]['id'])
print(f'Dashboard {dash_id}: {dashboards[0]["dashboard_title"]}')

# 3. Get embedded UUID
r = s.get(f'{BASE}/api/v1/dashboard/{dash_id}/embedded', timeout=10)
uuid = r.json()['result']['uuid']
print(f'Embedded UUID: {uuid}')

# 4. Get guest token
r = s.post(f'{BASE}/api/v1/security/guest_token/', json={
    'user': {'username': 'admin', 'first_name': 'Admin', 'last_name': ''},
    'resources': [{'type': 'dashboard', 'id': dash_id}],
    'rls': [],
}, timeout=10)
token = r.json()['token']
print(f'Guest token: {token[:30]}...')

# 5. Load embedded page (this creates a guest session)
s2 = requests.Session()
s2.headers['Referer'] = 'http://localhost:8001/'
r = s2.get(f'{BASE}/embedded/{uuid}?uiConfig=11', timeout=10, allow_redirects=True)
print(f'Embedded page: {r.status_code}')
print(f'Cookies: {list(s2.cookies.keys())}')

# 6. Try PUT with the guest session
r2 = s2.put(f'{BASE}/api/v1/dashboard/{dash_id}', json={'published': True}, timeout=10)
print(f'PUT dashboard (guest session): {r2.status_code}')
if r2.status_code >= 400:
    print(r2.text[:300])

# 7. Try GET with the guest session  
r3 = s2.get(f'{BASE}/api/v1/dashboard/{dash_id}', timeout=10)
print(f'GET dashboard (guest session): {r3.status_code}')
