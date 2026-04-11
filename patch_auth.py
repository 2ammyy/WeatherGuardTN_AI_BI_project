content = open('frontend/src/forum/hooks/useAuth.jsx', encoding='utf-8').read()

content = content.replace(
    'export function AuthProvider({ children }) {\n  const [user,    setUser]    = useState(null);\n  const [loading, setLoading] = useState(true);',
    'export function AuthProvider({ children, existingUser }) {\n  const [user,    setUser]    = useState(existingUser ? { display_name: existingUser.name, username: existingUser.email?.split("@")[0], ...existingUser } : null);\n  const [loading, setLoading] = useState(!existingUser);'
)

open('frontend/src/forum/hooks/useAuth.jsx', 'w', encoding='utf-8').write(content)
print('Done')
