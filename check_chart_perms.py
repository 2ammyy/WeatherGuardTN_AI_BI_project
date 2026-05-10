import os, sys
os.chdir('/app')

from superset import create_app
app = create_app()

with app.app_context():
    from superset import db, security_manager
    
    # Check all permissions related to chart
    all_perms = security_manager.get_session.query(
        security_manager.permissionview_model
    ).all()
    
    print("All chart-related permission-view_menu combos:")
    for pvm in sorted(all_perms, key=lambda x: (x.permission.name, x.view_menu.name)):
        pname = pvm.permission.name
        vname = pvm.view_menu.name
        if 'chart' in pname.lower() or 'chart' in vname.lower():
            print(f'  {pname} on {vname}')
    
    gamma = security_manager.find_role('Gamma')
    print(f"\nGamma permissions count: {len(gamma.permissions)}")
    print("Gamma chart-related permissions:")
    for p in sorted(gamma.permissions, key=lambda x: (x.permission.name, x.view_menu.name)):
        if 'chart' in p.permission.name.lower() or 'chart' in p.view_menu.name.lower():
            print(f'  {p.permission.name} on {p.view_menu.name}')
