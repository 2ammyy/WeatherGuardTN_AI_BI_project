import requests, json, urllib.parse

BASE = 'http://superset:8088'

# Login
s = requests.Session()
r = s.post(f'{BASE}/api/v1/security/login', json={'username':'admin','password':'admin123','provider':'db','refresh':True}, timeout=10)
token = r.json()['access_token']
s.headers['Authorization'] = f'Bearer {token}'
r = s.get(f'{BASE}/api/v1/security/csrf_token', timeout=10)
csrf = r.json()['result']

# Guest token
r = s.post(f'{BASE}/api/v1/security/guest_token/', json={
    'user': {'username':'admin','first_name':'Admin','last_name':''},
    'resources': [{'type':'dashboard','id':'2'}],
    'rls': [],
}, headers={'X-CSRFToken': csrf, 'Referer': f'{BASE}/'}, timeout=10)
gt = r.json()['token']
gh = {'X-GuestToken': gt, 'Referer': f'{BASE}/'}

# Step 1: Get the form_data for chart 49 from the API
r = requests.get(f'{BASE}/api/v1/chart/49', headers={**gh, 'Authorization': f'Bearer {token}'}, timeout=10)
chart49 = r.json().get('result', {})
print(f'Chart 49 form_data type: {type(chart49.get("form_data"))}')
fd = chart49.get('form_data', {})
if isinstance(fd, str):
    fd = json.loads(fd)
print(f'viz_type: {fd.get("viz_type")}')
print(f'datasource: {fd.get("datasource")}')
print(f'metrics: {fd.get("metrics")}')
print(f'granularity_sqla: {fd.get("granularity_sqla")}')
print(f'time_grain_sqla: {fd.get("time_grain_sqla")}')
print()

# Step 2: Try to get form_data via the form_data API
r = requests.get(f'{BASE}/api/v1/form_data/?slice_id=49', headers=gh, timeout=10)
if r.status_code == 200:
    fd_api = r.json()
    print(f'Form_data API response: {r.status_code}')
    print(f'viz_type: {fd_api.get("viz_type")}')
else:
    print(f'Form_data API: {r.status_code}')

# Step 3: Build the POST body EXACTLY like the frontend would
# The frontend calls (0,p.u)({formData:e, resultType:"full", resultFormat:"json", force:false, ...})
# This produces the query_context object
# Let me use the chart's saved query_context if available
qc = chart49.get('query_context')
if qc:
    print(f'\nSaved query_context: {json.dumps(qc, indent=2)[:500]}')

# Step 4: Try with just the minimal query_context needed
url = f'{BASE}/api/v1/chart/data?form_data={urllib.parse.quote(json.dumps({"slice_id":49}))}&dashboard_id=2&force'
body = {
    "datasource": {"id": 7, "type": "table"},
    "queries": [{
        "metrics": [{"expressionType":"SIMPLE","column":{"column_name":"total_users"},"aggregate":"MAX","label":"Users"}],
        "filters": [],
        "time_range": "No filter",
        "is_timeseries": False,
        "extras": {"having": "", "where": ""},
        "applied_time_extras": {},
        "columns": [],
        "order_desc": True,
        "orderby": [],
        "row_limit": 10000,
    }],
    "force": False,
    "result_format": "json",
    "result_type": "full",
    "form_data": fd,
}
r = requests.post(url, json=body, headers=gh, timeout=30)
print(f'\nFull form_data POST: {r.status_code}')
if r.status_code != 200:
    print(f'  {r.text[:500]}')

# Step 5: Try with query_context wrapper (as the frontend may send)
url2 = f'{BASE}/api/v1/chart/data?form_data={urllib.parse.quote(json.dumps({"slice_id":49}))}&dashboard_id=2&force'
body2 = {
    "query_context": body,
}
r = requests.post(url2, json=body2, headers=gh, timeout=30)
print(f'\nWrapped query_context POST: {r.status_code}')
if r.status_code != 200:
    print(f'  {r.text[:500]}')
