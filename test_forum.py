import httpx
r = httpx.get('http://localhost:8000/api/forum/posts?page=1&size=10')
print('Status:', r.status_code)
if r.status_code == 200:
    data = r.json()
    items = data.get('items', [])
    print(f'Found {len(items)} forum posts')
    for item in items[:5]:
        title = item.get('title', 'No title')
        print(f'  - {title}')
else:
    print('Failed to get forum posts')
