"""
apps/authentication/serializers.py
====================================
Input validation serializers for auth flows.
Business logic lives in services.py, not here.
"""
from django.contrib.auth import authenticate
from rest_framework import serializers
from apps.accounts.models import CustomUser, Role, Department


class RegisterSerializer(serializers.ModelSerializer):
    """
    Citizen self-registration.
    Only citizens can register themselves. Officers/admins are created by admins.
    """
    password = serializers.CharField(write_only=True, min_length=8, style={"input_type": "password"})
    password_confirm = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = CustomUser
        fields = ["email", "username", "first_name", "last_name", "password", "password_confirm"]

    def validate_email(self, value: str) -> str:
        if CustomUser.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_username(self, value: str) -> str:
        if CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        # Citizens are the only self-registering role
        citizen_role, _ = Role.objects.get_or_create(name=Role.CITIZEN)
        user = CustomUser.objects.create_user(
            email=validated_data["email"],
            username=validated_data["username"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            role=citizen_role,
        )
        return user


class LoginSerializer(serializers.Serializer):
    """Validate login credentials."""
    email = serializers.CharField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        login_id = attrs.get("email", "").lower()
        password = attrs.get("password")
        
        # Allow login via username OR email
        if "@" not in login_id:
            from apps.accounts.models import CustomUser
            user_obj = CustomUser.objects.filter(username=login_id).first()
            if user_obj:
                login_id = user_obj.email

        user = authenticate(request=self.context.get("request"), username=login_id, password=password)
        if not user:
            raise serializers.ValidationError(
                {"non_field_errors": "Invalid email or password."}
            )
        if not user.is_active:
            raise serializers.ValidationError(
                {"non_field_errors": "This account has been deactivated."}
            )
        attrs["user"] = user
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    """Authenticated user changing their own password."""
    old_password = serializers.CharField(write_only=True, style={"input_type": "password"})
    new_password = serializers.CharField(write_only=True, min_length=8, style={"input_type": "password"})
    new_password_confirm = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate_old_password(self, value: str) -> str:
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "Passwords do not match."})
        return attrs


class StaffCreateSerializer(serializers.ModelSerializer):
    """
    Admin creates officer or field worker accounts.
    Password is set by admin; user must change on first login.
    """
    password = serializers.CharField(write_only=True, min_length=8)
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.exclude(name=Role.SUPER_ADMIN), source="role"
    )
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source="department", required=False, allow_null=True
    )
    
    # Profile fields
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    state_id = serializers.IntegerField(required=False, allow_null=True)
    district_id = serializers.IntegerField(required=False, allow_null=True)
    city_id = serializers.IntegerField(required=False, allow_null=True)
    zone_id = serializers.IntegerField(required=False, allow_null=True)
    ward_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = CustomUser
        fields = [
            "email", "username", "first_name", "last_name",
            "password", "role_id", "department_id",
            "phone", "state_id", "district_id", "city_id", "zone_id", "ward_id"
        ]

    def validate_email(self, value: str) -> str:
        if CustomUser.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate(self, attrs):
        role = attrs.get("role")
        department = attrs.get("department")
        city_id = attrs.get("city_id")
        zone_id = attrs.get("zone_id")
        ward_id = attrs.get("ward_id")

        if role:
            if role.name == Role.SUPER_ADMIN:
                # Assuming simple protection: Normal staff creation cannot create Super Admin
                raise serializers.ValidationError({"role_id": "Cannot create Super Admin via this interface."})
                
            if role.name in [Role.OFFICER, Role.FIELD_WORKER]:
                if not department:
                    raise serializers.ValidationError({"department_id": f"Department is required for {role.name}."})
                if not city_id:
                    raise serializers.ValidationError({"city_id": f"City is required for {role.name}."})
            
            if role.name == Role.FIELD_WORKER:
                if not zone_id:
                    raise serializers.ValidationError({"zone_id": "Zone is required for FIELD_WORKER."})
                if not ward_id:
                    raise serializers.ValidationError({"ward_id": "Ward is required for FIELD_WORKER."})

        # Geo Validation
        if city_id:
            from apps.geography.models import City, Zone, Ward
            try:
                city = City.objects.get(id=city_id)
                if attrs.get("district_id") and city.district_id != attrs.get("district_id"):
                    raise serializers.ValidationError({"city_id": "City does not belong to the selected District."})
                
                if zone_id:
                    zone = Zone.objects.get(id=zone_id)
                    if zone.city_id != city_id:
                        raise serializers.ValidationError({"zone_id": "Zone does not belong to the selected City."})
                
                if ward_id:
                    ward = Ward.objects.get(id=ward_id)
                    if ward.city_id != city_id:
                        raise serializers.ValidationError({"ward_id": "Ward does not belong to the selected City."})
                    if zone_id and ward.zone_id and ward.zone_id != zone_id:
                        raise serializers.ValidationError({"ward_id": "Ward does not belong to the selected Zone."})
            except (City.DoesNotExist, Zone.DoesNotExist, Ward.DoesNotExist):
                raise serializers.ValidationError({"non_field_errors": "Invalid geography selection."})

        return attrs

    def create(self, validated_data):
        # Extract profile fields
        profile_data = {
            "phone": validated_data.pop("phone", ""),
            "state_ref_id": validated_data.pop("state_id", None),
            "district_ref_id": validated_data.pop("district_id", None),
            "city_ref_id": validated_data.pop("city_id", None),
            "zone_ref_id": validated_data.pop("zone_id", None),
            "ward_ref_id": validated_data.pop("ward_id", None),
        }

        password = validated_data.pop("password")
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.save()
        
        # Attach profile data to the user object temporarily for AuthService to pick up
        user._profile_data = profile_data
        return user
