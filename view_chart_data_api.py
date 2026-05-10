import inspect, os
os.chdir('/app')

from superset import create_app
app = create_app()
with app.app_context():
    from superset.charts.data.api import ChartDataRestApi
    print(inspect.getsource(ChartDataRestApi.data))
