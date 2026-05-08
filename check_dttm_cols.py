import json, os
os.chdir('/app')
from superset import create_app
app = create_app()
with app.app_context():
    from superset import db
    from superset.connectors.sqla.models import SqlaTable
    
    tables = db.session.query(SqlaTable).filter(SqlaTable.id.in_([6, 8])).all()
    for t in tables:
        print(f'Table {t.id}: {t.table_name}')
        print(f'  schema: {t.schema}')
        print(f'  main_dttm_col: {t.main_dttm_col}')
        print(f'  columns:')
        for col in t.columns:
            print(f'    {col.column_name}: type={col.type}, is_dttm={col.is_dttm}')
