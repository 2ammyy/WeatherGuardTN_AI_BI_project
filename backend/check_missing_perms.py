import sys
sys.path.insert(0, '/app')

from superset import create_app
app = create_app()

with app.app_context():
    from superset import db, security_manager
    
    gamma = security_manager.find_role('Gamma')
    admin = security_manager.find_role('Admin')
    
    # Find missing permissions that Admin has but Gamma doesn't
    # that could be needed for chart data queries
    admin_perms = { (p.permission.name, p.view_menu.name) for p in admin.permissions }
    gamma_perms = { (p.permission.name, p.view_menu.name) for p in gamma.permissions }
    missing = admin_perms - gamma_perms
    
    print('Permissions Admin has but Gamma is missing:')
    for pname, vname in sorted(missing):
        print(f'  {pname} on {vname}')
