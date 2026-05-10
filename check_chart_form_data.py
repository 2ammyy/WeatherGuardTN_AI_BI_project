import json, os
os.chdir('/app')
from superset import create_app
app = create_app()
with app.app_context():
    from superset import db
    from superset.models.slice import Slice
    for sid in [46, 47]:
        slc = db.session.query(Slice).filter(Slice.id == sid).first()
        if slc:
            fd = json.loads(slc.form_data) if isinstance(slc.form_data, str) else slc.form_data
            print(f'Chart {sid} ({slc.slice_name}):')
            for k in ['viz_type', 'datasource', 'granularity', 'granularity_sqla', 'time_grain_sqla', 'metrics', 'groupby', 'time_range', 'filters', 'adhoc_filters']:
                if k in fd:
                    print(f'  {k}: {fd[k]}')
            print()

    # Check explore_json storage
    from superset.models.key_value import KeyValue
    cached = db.session.query(KeyValue).filter(KeyValue.id.like('%explore%')).all()
    print(f'\nKeyValue count: {len(cached)}')
