import inspect, os
os.chdir('/app')

from superset import create_app
app = create_app()
with app.app_context():
    from superset.charts.data.commands.get_data_command import ChartDataCommand
    src = inspect.getsource(ChartDataCommand.run)
    print(src[:3000])
