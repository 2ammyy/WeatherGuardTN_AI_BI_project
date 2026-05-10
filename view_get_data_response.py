import inspect, os
os.chdir('/app')

from superset import create_app
app = create_app()
with app.app_context():
    from superset.charts.data.api import ChartDataRestApi
    src = inspect.getsource(ChartDataRestApi._get_data_response)
    print(src[:3000])
