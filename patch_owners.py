import re

with open('/app/superset/commands/utils.py', 'r') as f:
    content = f.read()

# Fix populate_owners to skip GuestUser objects (not SQLAlchemy models)
old = """    if not (security_manager.is_admin() or get_user_id() in owner_ids):
        # make sure non-admins can't remove themselves as owner by mistake
        owners.append(g.user)"""
new = """    if not (security_manager.is_admin() or get_user_id() in owner_ids):
        # make sure non-admins can't remove themselves as owner by mistake
        if not getattr(g.user, 'is_guest_user', False):
            owners.append(g.user)"""
content = content.replace(old, new)

with open('/app/superset/commands/utils.py', 'w') as f:
    f.write(content)
print('Patched populate_owners to skip GuestUser')
