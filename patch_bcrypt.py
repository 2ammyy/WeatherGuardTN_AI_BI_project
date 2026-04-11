content = open('backend/app/forum/auth.py', encoding='utf-8').read()

content = content.replace(
    'def hash_password(plain: str) -> str:\n    return pwd_ctx.hash(plain)',
    'def hash_password(plain: str) -> str:\n    return pwd_ctx.hash(plain[:72])'
)

content = content.replace(
    'def verify_password(plain: str, hashed: str) -> bool:\n    return pwd_ctx.verify(plain, hashed)',
    'def verify_password(plain: str, hashed: str) -> bool:\n    return pwd_ctx.verify(plain[:72], hashed)'
)

open('backend/app/forum/auth.py', 'w', encoding='utf-8').write(content)
print('Done')
