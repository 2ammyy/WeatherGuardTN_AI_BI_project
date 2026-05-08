import sys
sys.path.insert(0, '/app')

from superset import create_app
app = create_app()

with app.app_context():
    from superset import db, security_manager
    
    gamma = security_manager.find_role('Gamma')
    
    # Find or create the required permissions
    # Need: can_get on Chart, and check chart data access
    
    # Check ChartDataRestApi permissions
    from superset.charts.data.api import ChartDataRestApi
    
    # Get all available permission views
    all_perms = db.session.query(
        security_manager.permissionview_model
    ).all()
    
    print('All available permission names matching chart/data:')
    for pv in all_perms:
        pname = pv.permission.name
        vname = pv.view_menu.name
        if 'chart' in vname.lower() or pname in ['can_get', 'can_data', 'can_add', 'can_post']:
            print(f'  {pname} on {vname}')
    
    # Also check database-specific permissions for database 1
    print('\nDatabase-specific permissions:')
    for pv in all_perms:
        if 'database' in vname.lower():
            print(f'  {pv.permission.name} on {pv.view_menu.name}')
