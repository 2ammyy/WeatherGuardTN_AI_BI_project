"""Fix dashboard 65 using admin API's superset session."""
import sys
sys.path.insert(0, '/app')

from app.admin.api import _superset_session
import json

sess = _superset_session()

# Get dashboard 65
r = sess.get('http://superset:8088/api/v1/dashboard/65', timeout=10)
dash = r.json()['result']
pos = json.loads(dash['position_json'])

valid_ids = {4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 24, 25, 28}
new_pos = {}
valid_children = []

for key, val in pos.items():
    if key.startswith('CHART-'):
        chart_id = val.get('meta', {}).get('chartId')
        if chart_id in valid_ids:
            new_pos[key] = val
            valid_children.append(key)
    else:
        new_pos[key] = val

new_pos['GRID_ID']['children'] = valid_children
new_pos_json = json.dumps(new_pos, separators=(',', ':'))

body = {'position_json': new_pos_json}
r = sess.put('http://superset:8088/api/v1/dashboard/65', json=body, timeout=10)

if r.status_code == 200:
    print(f'✓ Dashboard 65 fixed! Now has {len(valid_children)} valid charts.')
    print(f'  Charts: {valid_children}')
else:
    print(f'✗ Failed: {r.status_code}')
    print(f'  Response: {r.text[:500]}')
