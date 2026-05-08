import inspect, os
os.chdir('/app')

from superset import create_app
app = create_app()
with app.app_context():
    from superset.views.core import Superset
    print(inspect.getsource(Superset.explore_json)[:2000])
