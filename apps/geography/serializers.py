"""
apps/geography/serializers.py
==============================
Serializers for Odisha geographic hierarchy APIs.
"""
from rest_framework import serializers
from .models import State, District, City, Zone, Ward, Location, Facility


class StateSerializer(serializers.ModelSerializer):
    class Meta:
        model = State
        fields = ['id', 'name', 'code', 'country']


class DistrictSerializer(serializers.ModelSerializer):
    state_name = serializers.CharField(source='state.name', read_only=True)

    class Meta:
        model = District
        fields = ['id', 'name', 'state', 'state_name', 'latitude', 'longitude', 'is_active']


class CitySerializer(serializers.ModelSerializer):
    district_name = serializers.CharField(source='district.name', read_only=True)
    state_name = serializers.CharField(source='district.state.name', read_only=True)

    class Meta:
        model = City
        fields = [
            'id', 'name', 'district', 'district_name', 'state_name',
            'latitude', 'longitude', 'population', 'is_active', 'is_default'
        ]

    def validate(self, attrs):
        district = attrs.get('district') or (self.instance.district if self.instance else None)
        name = attrs.get('name') or (self.instance.name if self.instance else None)
        lat = attrs.get('latitude') or (self.instance.latitude if self.instance else None)
        lng = attrs.get('longitude') or (self.instance.longitude if self.instance else None)

        if district and name:
            qs = City.objects.filter(name__iexact=name, district=district)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"name": "A city with this name already exists in this district."})

        if lat is not None and (lat < -90 or lat > 90):
            raise serializers.ValidationError({"latitude": "Latitude must be between -90 and 90."})
        if lng is not None and (lng < -180 or lng > 180):
            raise serializers.ValidationError({"longitude": "Longitude must be between -180 and 180."})

        return attrs


class ZoneSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source='city.name', read_only=True)

    class Meta:
        model = Zone
        fields = ['id', 'name', 'city', 'city_name', 'is_active']

    def validate(self, attrs):
        city = attrs.get('city') or (self.instance.city if self.instance else None)
        name = attrs.get('name') or (self.instance.name if self.instance else None)
        
        if city and name:
            qs = Zone.objects.filter(name__iexact=name, city=city)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"name": "A zone with this name already exists in this city."})
                
        return attrs


class WardSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source='city.name', read_only=True)
    zone_name = serializers.CharField(source='zone.name', read_only=True, default=None)

    class Meta:
        model = Ward
        fields = ['id', 'number', 'name', 'city', 'city_name', 'zone', 'zone_name', 'is_active']

    def validate(self, attrs):
        city = attrs.get('city') or (self.instance.city if self.instance else None)
        name = attrs.get('name') or (self.instance.name if self.instance else None)
        number = attrs.get('number') or (self.instance.number if self.instance else None)

        zone = attrs.get('zone') or (self.instance.zone if self.instance else None)

        if city:
            if name:
                qs = Ward.objects.filter(name__iexact=name, city=city)
                if self.instance:
                    qs = qs.exclude(pk=self.instance.pk)
                if qs.exists():
                    raise serializers.ValidationError({"name": "A ward with this name already exists in this city."})
            
            if number:
                qs = Ward.objects.filter(number=number, city=city)
                if self.instance:
                    qs = qs.exclude(pk=self.instance.pk)
                if qs.exists():
                    raise serializers.ValidationError({"number": "A ward with this number already exists in this city."})
            
            # Cross-hierarchy validation
            if zone and zone.city_id != city.id:
                raise serializers.ValidationError({"zone": "The selected zone must belong to the selected city."})

        return attrs


class LocationSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source='city.name', read_only=True)

    class Meta:
        model = Location
        fields = [
            'id', 'latitude', 'longitude', 'address', 'landmark',
            'ward', 'city', 'city_name', 'source', 'is_demo'
        ]


class FacilitySerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source='city.name', read_only=True)
    district_name = serializers.CharField(source='district.name', read_only=True)
    type_display = serializers.CharField(source='get_facility_type_display', read_only=True)

    class Meta:
        model = Facility
        fields = [
            'id', 'name', 'facility_type', 'type_display',
            'city', 'city_name', 'district', 'district_name',
            'address', 'latitude', 'longitude',
            'phone', 'is_demo', 'status', 'notes'
        ]
