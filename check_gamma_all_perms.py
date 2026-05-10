import os, sys
os.chdir('/app')

from superset import create_app
app = create_app()

with app.app_context():
    from superset import db, security_manager
    
    # Check all permissions for Gamma on explore/sql/chart data related views
    gamma = security_manager.find_role('Gamma')
    print("Gamma ALL permissions:")
    for p in sorted(gamma.permissions, key=lambda x: (x.permission.name, x.view_menu.name)):
        print(f'  {p.permission.name} on {p.view_menu.name}')
