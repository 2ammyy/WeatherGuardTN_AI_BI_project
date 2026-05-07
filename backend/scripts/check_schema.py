"""Check table schemas."""
from app.database import engine
from sqlalchemy import inspect

insp = inspect(engine)
for t in ['post_reports', 'comment_reports', 'user_reports']:
    cols = insp.get_columns(t)
    print(f'=== {t} ===')
    for c in cols:
        info = f'  {c["name"]}: {c["type"]}'
        if c.get('default'): info += f' default={c["default"]}'
        if not c.get('nullable', True): info += ' NOT NULL'
        print(info)
    print()
