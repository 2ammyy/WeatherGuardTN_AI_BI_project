import requests, json, urllib.parse

BASE = 'http://superset:8088'
s = requests.Session()
r = s.post(f'{BASE}/api/v1/security/login', json={'username':'admin','password':'admin123','provider':'db','refresh':True}, timeout=10)
token = r.json()['access_token']
s.headers['Authorization'] = f'Bearer {token}'
r = s.get(f'{BASE}/api/v1/security/csrf_token', timeout=10)
csrf = r.json()['result']

r = s.post(f'{BASE}/api/v1/security/guest_token/', json={
    'user': {'username':'admin','first_name':'Admin','last_name':''},
    'resources': [{'type':'dashboard','id':'2'}],
    'rls': [],
}, headers={'X-CSRFToken': csrf, 'Referer': f'{BASE}/'}, timeout=10)
gt = r.json()['token']

gh = {'X-GuestToken': gt, 'Referer': f'{BASE}/'}

# Test each failing chart EXACTLY as the browser would send
# Chart 46 - explore_json GET
url = f'{BASE}/superset/explore_json/?form_data={urllib.parse.quote(json.dumps({"slice_id":46}))}&dashboard_id=2'
r = requests.get(url, headers=gh, timeout=30)
print(f'Chart 46 (explore_json GET): {r.status_code}')
if r.status_code != 200:
    print(f'  {r.text[:300]}')

# Chart 47 - explore_json GET
url = f'{BASE}/superset/explore_json/?form_data={urllib.parse.quote(json.dumps({"slice_id":47}))}&dashboard_id=2'
r = requests.get(url, headers=gh, timeout=30)
print(f'Chart 47 (explore_json GET): {r.status_code}')
if r.status_code != 200:
    print(f'  {r.text[:300]}')

# Chart 49 - chart/data POST (exact frontend format)
# Frontend sends POST with query params + JSON body
# Build the query context body matching what (0,p.u) would produce
url = f'{BASE}/api/v1/chart/data?form_data={urllib.parse.quote(json.dumps({"slice_id":49}))}&dashboard_id=2&force'
r = requests.post(url, json={
    "datasource": {"id": 7, "type": "table"},
    "queries": [{
        "metrics": [{"expressionType":"SIMPLE","column":{"column_name":"total_users"},"aggregate":"MAX","label":"Users"}],
        "filters": [],
        "time_range": "No filter",
        "is_timeseries": False,
    }],
    "force": False,
    "result_format": "json",
    "result_type": "full",
    "form_data": {"slice_id": 49, "dashboard_id": 2}
}, headers=gh, timeout=30)
print(f'Chart 49 (chart/data POST): {r.status_code}')
if r.status_code != 200:
    print(f'  {r.text[:300]}')

# Chart 50 - same
url = f'{BASE}/api/v1/chart/data?form_data={urllib.parse.quote(json.dumps({"slice_id":50}))}&dashboard_id=2&force'
r = requests.post(url, json={
    "datasource": {"id": 7, "type": "table"},
    "queries": [{"metrics": [{"expressionType":"SIMPLE","column":{"column_name":"total_posts"},"aggregate":"MAX","label":"Posts"}],"filters":[],"time_range":"No filter","is_timeseries":False}],
    "force": False, "result_format": "json", "result_type": "full",
    "form_data": {"slice_id": 50, "dashboard_id": 2}
}, headers=gh, timeout=30)
print(f'Chart 50 (chart/data POST): {r.status_code}')
if r.status_code != 200:
    print(f'  {r.text[:300]}')

# Chart 51
url = f'{BASE}/api/v1/chart/data?form_data={urllib.parse.quote(json.dumps({"slice_id":51}))}&dashboard_id=2&force'
r = requests.post(url, json={
    "datasource": {"id": 7, "type": "table"},
    "queries": [{"metrics": [{"expressionType":"SIMPLE","column":{"column_name":"total_comments"},"aggregate":"MAX","label":"Comments"}],"filters":[],"time_range":"No filter","is_timeseries":False}],
    "force": False, "result_format": "json", "result_type": "full",
    "form_data": {"slice_id": 51, "dashboard_id": 2}
}, headers=gh, timeout=30)
print(f'Chart 51 (chart/data POST): {r.status_code}')
if r.status_code != 200:
    print(f'  {r.text[:300]}')

# Chart 52
url = f'{BASE}/api/v1/chart/data?form_data={urllib.parse.quote(json.dumps({"slice_id":52}))}&dashboard_id=2&force'
r = requests.post(url, json={
    "datasource": {"id": 7, "type": "table"},
    "queries": [{"metrics": [{"expressionType":"SIMPLE","column":{"column_name":"banned_users"},"aggregate":"MAX","label":"Banned"}],"filters":[],"time_range":"No filter","is_timeseries":False}],
    "force": False, "result_format": "json", "result_type": "full",
    "form_data": {"slice_id": 52, "dashboard_id": 2}
}, headers=gh, timeout=30)
print(f'Chart 52 (chart/data POST): {r.status_code}')
if r.status_code != 200:
    print(f'  {r.text[:300]}')
