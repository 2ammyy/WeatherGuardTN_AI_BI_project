import inspect, os
os.chdir('/app')

from superset import create_app
app = create_app()
with app.app_context():
    from superset.views.core import check_datasource_perms
    print(inspect.getsource(check_datasource_perms))
