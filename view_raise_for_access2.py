import inspect, os
os.chdir('/app')

from superset import create_app
app = create_app()
with app.app_context():
    from superset.security.manager import SupersetSecurityManager
    print(inspect.getsource(SupersetSecurityManager.raise_for_access))
