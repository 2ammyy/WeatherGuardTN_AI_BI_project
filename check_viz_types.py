import json, os
os.chdir('/app')
from superset import create_app
app = create_app()
with app.app_context():
    from superset import db
    from superset.models.slice import Slice
    for sid in [46, 47, 49, 50, 51, 52]:
        slc = db.session.query(Slice).filter(Slice.id == sid).first()
        if slc:
            fd = json.loads(slc.form_data) if isinstance(slc.form_data, str) else slc.form_data
            print(f'Chart {sid} ({slc.slice_name}): viz_type={fd.get("viz_type")}, datasource={fd.get("datasource")}')
