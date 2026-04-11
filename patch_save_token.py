content = open('frontend/src/App.js', encoding='utf-8').read()

# Save forum_token to localStorage when login succeeds
content = content.replace(
    'onLoginSuccess={(userData) => setUser(userData)}',
    'onLoginSuccess={(userData) => { setUser(userData); if(userData.forum_token){ localStorage.setItem("forum_access_token", userData.forum_token); } }}'
)

# Also handle Google login success in header
content = content.replace(
    'onLoginSuccess={e=>n(e)}',
    'onLoginSuccess={e=>{ n(e); if(e.forum_token){ localStorage.setItem("forum_access_token", e.forum_token); } }}'
)

open('frontend/src/App.js', 'w', encoding='utf-8').write(content)
print('Done')
