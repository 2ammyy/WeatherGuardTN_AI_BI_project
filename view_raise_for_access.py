import inspect, os
os.chdir('/app')

from superset import create_app
app = create_app()
with app.app_context():
    from superset.viz import BaseViz
    print(inspect.getsource(BaseViz.raise_for_access))
