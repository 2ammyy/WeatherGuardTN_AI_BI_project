import re

with open('/app/superset/security/manager.py', 'r') as f:
    content = f.read()

old = """        if g.user.is_anonymous or g.user not in owners:
            raise SupersetSecurityException"""
new = """        if self.is_guest_user():
            return
        if g.user.is_anonymous or g.user not in owners:
            raise SupersetSecurityException"""
content = content.replace(old, new)

with open('/app/superset/security/manager.py', 'w') as f:
    f.write(content)
print('Patched raise_for_ownership for guest users')
