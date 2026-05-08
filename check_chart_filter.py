import inspect
from superset import create_app

app = create_app()
with app.app_context():
    from superset.charts.filters import ChartFilter
    print(inspect.getsource(ChartFilter))
