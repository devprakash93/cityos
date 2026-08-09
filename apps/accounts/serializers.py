"""
apps/accounts/serializers.py
============================
Serializers for users, profiles, departments, and roles.
"""
from rest_framework import serializers
from .models import CustomUser, UserProfile, Role, Department, ActivityLog

class ActivityLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = "__all__"



class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "name", "description"]


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = [
            "id", "name", "code", "description",
            "contact_email", "contact_phone", "is_active",
        ]


class UserProfileSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    city_name = serializers.CharField(source='city_ref.name', read_only=True)
    district_name = serializers.CharField(source='district_ref.name', read_only=True)
    zone_name = serializers.CharField(source='zone_ref.name', read_only=True)
    ward_name = serializers.CharField(source='ward_ref.name', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            "avatar", "avatar_url", "phone", "address",
            "city_ref", "city_name", "district_ref", "district_name",
            "zone_ref", "zone_name",
            "ward_ref", "ward_name", "city", "state", "pincode",
            "bio", "date_of_birth", "language", "employee_id", "availability", "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def get_avatar_url(self, obj) -> str | None:
        request = self.context.get("request")
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None


class UserSummarySerializer(serializers.ModelSerializer):
    """Minimal user representation used as nested FK in other serializers."""
    role_name = serializers.CharField(source="role.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True, default=None)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = CustomUser
        fields = ["id", "email", "username", "full_name", "role_name", "department_name"]


class UserDetailSerializer(serializers.ModelSerializer):
    """Full user representation including nested profile, role, department."""
    role = RoleSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            "id", "email", "username", "first_name", "last_name", "full_name",
            "role", "department", "profile", "is_active", "date_joined",
        ]
        read_only_fields = ["email", "date_joined", "is_active"]


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating own profile (name + nested profile fields)."""
    profile = UserProfileSerializer()

    class Meta:
        model = CustomUser
        fields = ["first_name", "last_name", "username", "profile"]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        # Update top-level user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update or create profile
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        return instance


class AdminUserListSerializer(serializers.ModelSerializer):
    """Used by super admin to list/manage all users."""
    role_name = serializers.CharField(source="role.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True, default=None)

    class Meta:
        model = CustomUser
        fields = [
            "id", "email", "username", "first_name", "last_name",
            "role_name", "department_name", "is_active", "date_joined",
        ]


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """Allows super admin to change role and department of any user."""
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(), source="role", write_only=True, required=False
    )
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source="department", write_only=True,
        required=False, allow_null=True
    )
    # Expose profile fields for updates
    phone = serializers.CharField(source="profile.phone", required=False, allow_blank=True)
    state_ref = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.geography.models', fromlist=['State']).State.objects.all(),
        source="profile.state_ref", required=False, allow_null=True
    )
    district_ref = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.geography.models', fromlist=['District']).District.objects.all(),
        source="profile.district_ref", required=False, allow_null=True
    )
    city_ref = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.geography.models', fromlist=['City']).City.objects.all(),
        source="profile.city_ref", required=False, allow_null=True
    )
    zone_ref = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.geography.models', fromlist=['Zone']).Zone.objects.all(),
        source="profile.zone_ref", required=False, allow_null=True
    )
    ward_ref = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.geography.models', fromlist=['Ward']).Ward.objects.all(),
        source="profile.ward_ref", required=False, allow_null=True
    )

    class Meta:
        model = CustomUser
        fields = [
            "first_name", "last_name", "is_active", "role_id", "department_id",
            "phone", "state_ref", "district_ref", "city_ref", "zone_ref", "ward_ref"
        ]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if profile_data is not None:
            profile, _ = UserProfile.objects.get_or_create(user=instance)
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()

        return instance
