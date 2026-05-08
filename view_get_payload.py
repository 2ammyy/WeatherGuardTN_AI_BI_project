import inspect, os
os.chdir('/app')

from superset import create_app
app = create_app()
with app.app_context():
    from superset.common.query_context import QueryContext
    src = inspect.getsource(QueryContext.get_payload)
    print(src[:3000])
