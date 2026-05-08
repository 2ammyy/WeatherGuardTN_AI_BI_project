import os, sys
os.chdir('/app')

from superset import create_app
app = create_app()

with app.app_context():
    from superset import db, security_manager
    
    # Check all databases
    from superset.connectors.sqla.models import Database
    databases = db.session.query(Database).all()
    print('Databases:')
    for d in databases:
        print(f'  ID: {d.id}, name: {d.database_name}')
    
    # Check all datasources
    from superset.connectors.sqla.models import SqlaTable
    tables = db.session.query(SqlaTable).all()
    print(f'\nDatasources (SqlaTable): {len(tables)}')
    for t in tables:
        print(f'  ID: {t.id}, name: {t.table_name}, schema: {t.schema}, database: {t.database.database_name if t.database else "N/A"}')
    
    # Check Gamma's permissions for database/datasource access
    gamma = security_manager.find_role('Gamma')
    print('\nGamma database/datasource related permissions:')
    for p in sorted(gamma.permissions, key=lambda x: (x.permission.name, x.view_menu.name)):
        pname = p.permission.name
        vname = p.view_menu.name
        if any(kw in pname.lower() for kw in ['database', 'datasource', 'all_', 'schema', 'access']):
            print(f'  {pname} on {vname}')
    
    # Check Admin's database/datasource permissions for reference
    admin = security_manager.find_role('Admin')
    print('\nAdmin database/datasource related permissions:')
    for p in sorted(admin.permissions, key=lambda x: (x.permission.name, x.view_menu.name)):
        pname = p.permission.name
        vname = p.view_menu.name
        if any(kw in pname.lower() for kw in ['database', 'datasource', 'all_', 'schema', 'access']):
            print(f'  {pname} on {vname}')
