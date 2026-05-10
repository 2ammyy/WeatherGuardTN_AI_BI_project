content = open('frontend/src/forum/pages/ForumPage.jsx', encoding='utf-8').read()

content = content.replace(
    'export default function ForumPage({ onBack }) {\n  return (\n    <AuthProvider>\n      <ForumInner onBack={onBack} />\n    </AuthProvider>\n  );\n}',
    'export default function ForumPage({ onBack, existingUser }) {\n  return (\n    <AuthProvider existingUser={existingUser}>\n      <ForumInner onBack={onBack} />\n    </AuthProvider>\n  );\n}'
)

open('frontend/src/forum/pages/ForumPage.jsx', 'w', encoding='utf-8').write(content)
print('Done')
