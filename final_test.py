import requests
import json

BASE = 'http://localhost:8088'

# 1. Login to Superset
s = requests.Session()
r = s.post(f'{BASE}/api/v1/security/login', json={'username':'admin','password':'admin123','provider':'db','refresh':True}, timeout=10)
s.headers.update({'Authorization': 'Bearer '+r.json()['access_token']})
s.headers['Referer'] = f'{BASE}/'

# 2. Get guest token
r = s.post(f'{BASE}/api/v1/security/guest_token/', json={
    'user': {'username': 'admin', 'first_name': 'Admin', 'last_name': ''},
    'resources': [{'type': 'dashboard', 'id': '65'}],
    'rls': [],
}, timeout=10)
token = r.json()['token']
print(f'Guest token: OK ({token[:20]}...)')

# 3. Test GET with guest token
s2 = requests.Session()
s2.headers['X-GuestToken'] = token
s2.headers['Referer'] = f'{BASE}/'

r = s2.get(f'{BASE}/api/v1/dashboard/65', timeout=10)
print(f'GET dashboard/65: {r.status_code}')

# 4. Test PUT with guest token (this was failing before)
r = s2.put(f'{BASE}/api/v1/dashboard/65', json={'json_metadata': '{"show_native_filters": true}'}, timeout=10)
print(f'PUT dashboard/65: {r.status_code}')

if r.status_code == 200:
    print('✓ SUCCESS: Guest user can now write to dashboard!')
elif r.status_code == 403:
    print(f'✗ FAILED: {r.text[:200]}')
else:
    print(f'? Status: {r.status_code}')
