import sys
sys.path.insert(0, '/app')

from superset import create_app
app = create_app()

with app.app_context():
    from superset import db, security_manager
    
    role = security_manager.find_role('Gamma')
    print(f'Gamma role ID: {role.id}')
    print(f'Gamma role name: {role.name}')
    
    perms = sorted(role.permissions, key=lambda x: (x.permission.name, x.view_menu.name))
    print(f'Total permissions: {len(perms)}')
    for p in perms:
        pname = p.permission.name
        vname = p.view_menu.name
        print(f'  {pname} on {vname}')
