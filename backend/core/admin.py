from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from . models import User, OpenCourtApplication

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'role', 'police_station', 'division']
    list_filter = ['role', 'is_staff', 'is_active']
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'phone', 'police_station', 'division')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Additional Info', {'fields': ('role', 'phone', 'police_station', 'division')}),
    )

@admin.register(OpenCourtApplication)
class OpenCourtApplicationAdmin(admin.ModelAdmin):
    list_display = ['sr_no', 'dairy_no', 'name', 'contact', 'police_station', 'status', 'feedback']
    list_filter = ['status', 'feedback', 'police_station', 'division']
    search_fields = ['name', 'dairy_no', 'contact']
    list_per_page = 50