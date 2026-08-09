"""
apps/complaints/admin.py
"""
from django.contrib import admin
from .models import Complaint, ComplaintMedia, ComplaintAssignment, ComplaintHistory


class ComplaintMediaInline(admin.TabularInline):
    model = ComplaintMedia
    extra = 0
    readonly_fields = ["uploaded_at"]


class ComplaintHistoryInline(admin.TabularInline):
    model = ComplaintHistory
    extra = 0
    readonly_fields = ["event_type", "old_value", "new_value", "changed_by", "timestamp"]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ["reference_number", "title", "citizen", "department", "status", "priority", "created_at"]
    list_filter = ["status", "priority", "category", "department"]
    search_fields = ["reference_number", "title", "citizen__email"]
    readonly_fields = ["reference_number", "created_at", "updated_at"]
    inlines = [ComplaintMediaInline, ComplaintHistoryInline]
    ordering = ["-created_at"]


@admin.register(ComplaintAssignment)
class ComplaintAssignmentAdmin(admin.ModelAdmin):
    list_display = ["complaint", "assigned_to", "assigned_by", "deadline", "is_active", "assigned_at"]
    list_filter = ["is_active"]
    search_fields = ["complaint__reference_number", "assigned_to__email"]
