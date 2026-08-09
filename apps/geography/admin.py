from django.contrib import admin
from .models import State, District, City, Zone, Ward, Location, Facility


@admin.register(State)
class StateAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'country']


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ['name', 'state']
    list_filter = ['state']
    search_fields = ['name']


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ['name', 'district', 'is_default', 'is_active', 'population']
    list_filter = ['district__state', 'is_active', 'is_default']
    search_fields = ['name']


@admin.register(Zone)
class ZoneAdmin(admin.ModelAdmin):
    list_display = ['name', 'city']
    list_filter = ['city']


@admin.register(Ward)
class WardAdmin(admin.ModelAdmin):
    list_display = ['number', 'name', 'city', 'zone']
    list_filter = ['city']


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ['address', 'city', 'source', 'is_demo']
    list_filter = ['city', 'source', 'is_demo']


@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display = ['name', 'facility_type', 'city', 'status', 'is_demo']
    list_filter = ['facility_type', 'city', 'status', 'is_demo']
    search_fields = ['name', 'address']
