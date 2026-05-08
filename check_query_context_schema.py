import inspect, os
os.chdir('/app')
from superset import create_app
app = create_app()
with app.app_context():
    from superset.charts.schemas import ChartDataQueryContextSchema
    print(inspect.getsource(ChartDataQueryContextSchema))
