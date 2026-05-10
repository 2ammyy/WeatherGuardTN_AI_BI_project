"""Add priority columns to report tables."""
from app.database import engine
from sqlalchemy import text

for table in ['post_reports', 'comment_reports', 'user_reports']:
    for col, dtype in [('priority', 'VARCHAR(10) DEFAULT \'medium\''), ('priority_score', 'INTEGER DEFAULT 50')]:
        try:
            with engine.connect() as conn:
                conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {col} {dtype}'))
                conn.commit()
            print(f'  Added {col} to {table}')
        except Exception as e:
            if 'already exists' in str(e).lower():
                print(f'  {col} already exists in {table}')
            else:
                print(f'  {table}/{col}: {e}')

print('Done adding priority columns.')
