"""
apps/complaints/serializers.py
================================
Serializers for complaint CRUD, assignment, status updates, history, and media.
"""
from rest_framework import serializers
from apps.accounts.serializers import UserSummarySerializer, DepartmentSerializer
from .models import Complaint, ComplaintMedia, ComplaintAssignment, ComplaintHistory


class ComplaintMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ComplaintMedia
        fields = ["id", "file", "file_url", "media_type", "caption", "uploaded_by", "uploaded_at"]
        read_only_fields = ["uploaded_by", "uploaded_at"]

    def get_file_url(self, obj) -> str | None:
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class ComplaintHistorySerializer(serializers.ModelSerializer):
    changed_by = UserSummarySerializer(read_only=True)

    class Meta:
        model = ComplaintHistory
        fields = ["id", "event_type", "old_value", "new_value", "remarks", "changed_by", "timestamp"]


class ComplaintAssignmentSerializer(serializers.ModelSerializer):
    assigned_to = UserSummarySerializer(read_only=True)
    assigned_by = UserSummarySerializer(read_only=True)

    class Meta:
        model = ComplaintAssignment
        fields = ["id", "assigned_to", "assigned_by", "deadline", "remarks", "assigned_at", "is_active"]


class ComplaintListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    citizen_name = serializers.CharField(source="citizen.full_name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True, default=None)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)

    class Meta:
        model = Complaint
        fields = [
            "id", "reference_number", "title", "category", "status", "status_display",
            "priority", "priority_display", "citizen_name", "department_name",
            "address", "created_at", "updated_at",
        ]


class ComplaintDetailSerializer(serializers.ModelSerializer):
    """Full serializer for detail view, including nested history and media."""
    citizen = UserSummarySerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    media = ComplaintMediaSerializer(many=True, read_only=True)
    history = ComplaintHistorySerializer(many=True, read_only=True)
    active_assignment = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)

    class Meta:
        model = Complaint
        fields = [
            "id", "reference_number", "title", "category", "description",
            "location_lat", "location_lng", "address",
            "status", "status_display", "priority", "priority_display",
            "citizen", "department",
            "media", "history", "active_assignment",
            "created_at", "updated_at",
        ]

    def get_active_assignment(self, obj):
        assignment = obj.assignments.filter(is_active=True).first()
        if assignment:
            return ComplaintAssignmentSerializer(assignment).data
        return None


class ComplaintCreateSerializer(serializers.ModelSerializer):
    """Used by citizens to submit a new complaint."""
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__("apps.accounts.models", fromlist=["Department"]).Department.objects.all(),
        source="department",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Complaint
        fields = [
            "title", "category", "description",
            "location_lat", "location_lng", "address",
            "priority", "department_id",
        ]

    def validate(self, attrs):
        # Auto-assign department from category if not provided
        if not attrs.get("department"):
            category = attrs.get("category")
            dept_map = {
                "ROAD": "CITIZEN_SERVICES",
                "STREET_LIGHT": "ELECTRICITY",
                "GARBAGE": "WASTE",
                "DRAINAGE": "WASTE",
                "WATER_SUPPLY": "WATER",
                "WATER_LEAKAGE": "WATER",
                "ELECTRICITY": "ELECTRICITY",
                "TRAFFIC_SIGNAL": "TRAFFIC",
                "TRANSPORT": "TRANSPORT",
                "ROAD_BLOCKAGE": "TRAFFIC",
                "POLLUTION": "POLLUTION",
                "STRAY_ANIMAL": "CITIZEN_SERVICES",
                "PUBLIC_TOILET": "WASTE",
                "FLOODING": "EMERGENCY",
                "CYCLONE": "EMERGENCY",
                "OTHER": "CITIZEN_SERVICES",
            }
            dept_code = dept_map.get(category)
            if dept_code:
                from apps.accounts.models import Department
                dept = Department.objects.filter(code=dept_code).first()
                if dept:
                    attrs["department"] = dept
        return attrs


class StatusUpdateSerializer(serializers.Serializer):
    """Officer or field worker updates complaint status."""
    status = serializers.ChoiceField(choices=Complaint.STATUS_CHOICES)
    remarks = serializers.CharField(required=False, allow_blank=True)

    def validate_status(self, value):
        complaint = self.context.get("complaint")
        if not complaint:
            return value
        # Enforce valid status transitions
        valid_transitions = {
            Complaint.PENDING: [Complaint.ASSIGNED, Complaint.REJECTED],
            Complaint.ASSIGNED: [Complaint.ACCEPTED, Complaint.REJECTED],
            Complaint.ACCEPTED: [Complaint.ON_SITE],
            Complaint.ON_SITE: [Complaint.IN_PROGRESS],
            Complaint.IN_PROGRESS: [Complaint.REVIEW],
            Complaint.REVIEW: [Complaint.RESOLVED, Complaint.IN_PROGRESS],
            Complaint.RESOLVED: [Complaint.CLOSED],
            Complaint.REJECTED: [],
            Complaint.CLOSED: [],
        }
        allowed = valid_transitions.get(complaint.status, [])
        if value not in allowed:
            raise serializers.ValidationError(
                f"Cannot transition from {complaint.status} to {value}. "
                f"Allowed: {allowed or 'none'}"
            )
        return value


class AssignComplaintSerializer(serializers.Serializer):
    """Officer assigns a complaint to a field worker."""
    assigned_to_id = serializers.IntegerField()
    deadline = serializers.DateTimeField(required=False, allow_null=True)
    remarks = serializers.CharField(required=False, allow_blank=True)

    def validate_assigned_to_id(self, value):
        from apps.accounts.models import CustomUser, Role
        try:
            user = CustomUser.objects.get(pk=value, role__name=Role.FIELD_WORKER, is_active=True)
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("Field worker not found or inactive.")
        return value


class MediaUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplaintMedia
        fields = ["file", "media_type", "caption"]
