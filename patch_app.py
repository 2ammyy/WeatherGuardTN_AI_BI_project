content = open('frontend/src/App.js', encoding='utf-8').read()

# Pass existing user to ForumPage
content = content.replace(
    'if (showForum) return <ForumPage onBack={() => setShowForum(false)} />;',
    'if (showForum) return <ForumPage onBack={() => setShowForum(false)} existingUser={user} />;'
)

open('frontend/src/App.js', 'w', encoding='utf-8').write(content)
print('Done')
