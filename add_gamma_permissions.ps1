<#
.SYNOPSIS
    Add missing chart permissions to Gamma role
.DESCRIPTION
    Uses Python script inside the Superset container to add permissions
#>

$script = @'
import os, sys
os.chdir('/app')

from superset import create_app
app = create_app()

with app.app_context():
    from superset import db, security_manager
    from superset.security import SupersetSecurityManager
    
    gamma = security_manager.find_role('Gamma')
    admin = security_manager.find_role('Admin')
    
    # Find available permissions
    all_perms = security_manager.get_all_permissions()
    
    # Find specific permission-view_menu combos we need
    target_perms = [
        ('can_get', 'Chart'),      # For GET /api/v1/chart/{pk}
        ('can_data', 'Chart'),     # For POST /api/v1/chart/data (method on ChartDataRestApi)
    ]
    
    print('Current Gamma permissions related to chart:')
    for p in gamma.permissions:
        if 'chart' in p.permission.name.lower() or 'chart' in p.view_menu.name.lower() or 'data' in p.permission.name.lower():
            print(f'  {p.permission.name} on {p.view_menu.name}')
    
    print()
    print('Adding missing permissions:')
    for pname, vname in target_perms:
        perm = security_manager.find_permission(pname)
        view = security_manager.find_view_menu(vname)
        if not perm:
            print(f'  Creating permission: {pname}')
            perm = security_manager.add_permission(pname)
        if not view:
            print(f'  Creating view_menu: {vname}')
            view = security_manager.add_view_menu(vname)
        
        # Check if already exists
        pvm = security_manager.find_permission_view_menu(perm, view)
        if not pvm:
            pvm = security_manager.add_permission_view_menu(perm, view)
            print(f'  Created pvm: {pname} on {vname}')
        else:
            print(f'  Already exists: {pname} on {vname}')
        
        # Check if gamma already has it
        has_perm = any(p.permission.name == pname and p.view_menu.name == vname for p in gamma.permissions)
        if not has_perm:
            gamma.permissions.append(pvm)
            db.session.commit()
            print(f'  Added to Gamma: {pname} on {vname}')
        else:
            print(f'  Gamma already has: {pname} on {vname}')
    
    print()
    print('Updated Gamma permissions related to chart:')
    for p in gamma.permissions:
        if 'chart' in p.permission.name.lower() or 'chart' in p.view_menu.name.lower() or 'data' in p.permission.name.lower():
            print(f'  {p.permission.name} on {p.view_menu.name}')
'@

docker exec climate-superset python -c $script