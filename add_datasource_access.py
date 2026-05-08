import os, sys
os.chdir('/app')

from superset import create_app
app = create_app()

with app.app_context():
    from superset import db, security_manager
    
    gamma = security_manager.find_role('Gamma')
    
    # Add all_datasource_access to Gamma
    perm = security_manager.find_permission('all_datasource_access')
    view = security_manager.find_view_menu('all_datasource_access')
    
    if not perm:
        print('Creating permission: all_datasource_access')
        perm = security_manager.add_permission('all_datasource_access')
    if not view:
        print('Creating view_menu: all_datasource_access')
        view = security_manager.add_view_menu('all_datasource_access')
    
    pvm = security_manager.find_permission_view_menu('all_datasource_access', 'all_datasource_access')
    if not pvm:
        pvm = security_manager.add_permission_view_menu('all_datasource_access', 'all_datasource_access')
        print('Created pvm: all_datasource_access')
    else:
        print('Already exists: all_datasource_access')
    
    has_perm = any(p.permission.name == 'all_datasource_access' for p in gamma.permissions)
    if not has_perm:
        gamma.permissions.append(pvm)
        db.session.commit()
        print('Added all_datasource_access to Gamma')
    else:
        print('Gamma already has all_datasource_access')
    
    # Also check if there are database-level permissions needed
    # Find "WeatherGuardTN" database permission
    from superset.connectors.sqla.models import Database
    db_obj = db.session.query(Database).first()
    if db_obj:
        db_perm_name = db_obj.perm  # e.g. "[WeatherGuardTN].(id:1)"
        print(f'\nDatabase permission name: {db_perm_name}')
        
        db_perm = security_manager.find_permission('database_access')
        db_view = security_manager.find_view_menu(db_perm_name)
        
        if db_perm and db_view:
            db_pvm = security_manager.find_permission_view_menu('database_access', db_perm_name)
            if db_pvm:
                has_db_perm = any(p.view_menu.name == db_perm_name for p in gamma.permissions)
                if not has_db_perm:
                    gamma.permissions.append(db_pvm)
                    db.session.commit()
                    print('Added database_access to Gamma')
                else:
                    print('Gamma already has database_access')
    
    print('\nGamma final permissions (datasource related):')
    for p in sorted(gamma.permissions, key=lambda x: (x.permission.name, x.view_menu.name)):
        pname = p.permission.name
        vname = p.view_menu.name
        if 'datasource' in pname.lower() or 'database' in pname.lower() or 'all_' in pname.lower():
            print(f'  {pname} on {vname}')
