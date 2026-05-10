import inspect
from superset import create_app

app = create_app()
with app.app_context():
    from superset.charts.api import ChartRestApi
    
    print('ChartRestApi attributes:')
    for attr in dir(ChartRestApi):
        if not attr.startswith('__'):
            val = getattr(ChartRestApi, attr)
            if isinstance(val, (str, bool, int, list, tuple, dict, set)):
                print(f'  {attr} = {val}')
    print('---')
    print('ChartDataRestApi attributes:' if hasattr(ChartRestApi, 'ChartDataRestApi') else '')
    
    # Check BaseSupersetModelRestApi for ownership
    from superset.views.base import BaseSupersetModelRestApi
    print('\nBaseSupersetModelRestApi ownership related:')
    for attr in dir(BaseSupersetModelRestApi):
        if 'ownership' in attr.lower() or 'filter' in attr.lower() or 'owned' in attr.lower():
            print(f'  {attr}')
