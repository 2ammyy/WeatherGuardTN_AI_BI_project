"""Verify moderation features."""
import json
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

r = client.post('/admin/login', data={'username':'admin@weatherguard.com','password':'admin123'}, follow_redirects=False)
c = r.headers['set-cookie'].split(';')[0]

for page in ['post-report', 'comment-report', 'user-report']:
    r = client.get('/admin/' + page + '/list', headers={'Cookie': c})
    has_prio = 'priority' in r.text.lower() or 'PRIO' in r.text
    print(f'{page}: {r.status_code} {len(r.text)}b | priority:{has_prio} | user_link:{"user_link" in r.text or "/admin/forum-user/details/" in r.text}')

r = client.get('/api/admin/reports/summary', headers={'Cookie': c})
d = r.json()
print('\nReport summary:')
for k, v in d.items():
    print(f'  {k}: total={v["total"]}, pending={v["pending"]}, high={v["high"]}, medium={v["medium"]}, low={v["low"]}')

r = client.post('/api/admin/priority/classify-all', headers={'Cookie': c})
print('\nClassify all:', r.json())
