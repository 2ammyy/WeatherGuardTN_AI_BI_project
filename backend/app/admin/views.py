from sqladmin import ModelView
from app.models.user import User

class UserAdmin(ModelView, model=User):
    # Basic columns to display
    column_list = ['id', 'email', 'full_name', 'is_admin', 'created_at']
    
    # Searchable fields
    column_searchable_list = ['email', 'full_name']
    
    # Editable fields (safe ones)
    column_editable_list = ['is_admin']
    
    # Hide sensitive fields
    form_excluded_columns = ['hashed_password']
    
    # Nice labels
    name = 'User'
    name_plural = 'Users'
    icon = 'fa-solid fa-users'

def register_views(admin):
    '''Register all admin views'''
    admin.add_view(UserAdmin)
    print('✅ UserAdmin view registered successfully')
