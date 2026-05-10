import inspect, os
os.chdir('/app')

from superset import create_app
app = create_app()
with app.app_context():
    from superset.common.query_context_processor import QueryContextProcessor
    src = inspect.getsource(QueryContextProcessor.raise_for_access)
    print(src)
