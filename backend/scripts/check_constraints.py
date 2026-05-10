"""Check constraints on report tables."""
from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    for table in ['post_reports', 'comment_reports', 'user_reports']:
        print(f'=== {table} ===')
        rows = conn.execute(
            text("SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = :t)"),
            {"t": table}
        ).fetchall()
        for r in rows:
            print(f'  {r[0]}: {r[1]}')
        print()
