import inspect, os
os.chdir('/app')

from superset import create_app
app = create_app()
with app.app_context():
    from superset.utils.core import get_form_data
    print(inspect.getsource(get_form_data))
