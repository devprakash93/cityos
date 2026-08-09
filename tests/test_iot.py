"""
tests/test_iot.py
Unit tests for the IoT simulator.
"""
import pytest
from decimal import Decimal


@pytest.fixture
def traffic_zone(db):
    from apps.traffic.models import TrafficZone
    from apps.geography.models import Zone, City, State, District
    state = State.objects.create(name="Test State", code="TS")
    district = District.objects.create(name="Test District", state=state)
    city = City.objects.create(name="Test City", district=district)
    geo_zone = Zone.objects.create(name="Test Geo Zone", city=city)
    return TrafficZone.objects.create(
        name="Test Zone",
        code="TEST-01",
        zone=geo_zone,
        road_type="ARTERIAL",
        speed_limit_kmh=60,
    )


@pytest.fixture
def waste_bin(db):
    from apps.waste.models import WasteBin
    from apps.geography.models import Location, Ward, City, State, District
    state = State.objects.create(name="Test State 2", code="TS2")
    district = District.objects.create(name="Test District 2", state=state)
    city = City.objects.create(name="Test City 2", district=district)
    ward = Ward.objects.create(number=1, city=city)
    location = Location.objects.create(latitude=Decimal("28.6200"), longitude=Decimal("77.2100"), ward=ward, city=city)
    return WasteBin.objects.create(
        name="Test Bin",
        bin_type="GENERAL",
        location=location,
        capacity_liters=100,
    )


@pytest.fixture
def aqi_station(db):
    from apps.pollution.models import AQIStation
    from apps.geography.models import Location, City, State, District
    state = State.objects.create(name="Test State 3", code="TS3")
    district = District.objects.create(name="Test District 3", state=state)
    city = City.objects.create(name="Test City 3", district=district)
    location = Location.objects.create(latitude=Decimal("28.6139"), longitude=Decimal("77.2090"), city=city)
    return AQIStation.objects.create(
        name="Test Station",
        location=location,
    )


@pytest.mark.django_db
class TestSimulatorTick:
    def test_traffic_simulation_creates_readings(self, traffic_zone):
        from apps.iot_simulator.simulator import CitySimulator
        from apps.traffic.models import TrafficReading
        sim = CitySimulator()
        count = sim.simulate_traffic()
        assert count >= 1
        assert TrafficReading.objects.filter(zone=traffic_zone).exists()

    def test_waste_simulation_creates_readings(self, waste_bin):
        from apps.iot_simulator.simulator import CitySimulator
        from apps.waste.models import WasteBinReading
        sim = CitySimulator()
        count = sim.simulate_waste()
        assert count >= 1
        assert WasteBinReading.objects.filter(bin=waste_bin).exists()

    def test_pollution_simulation_creates_readings(self, aqi_station):
        from apps.iot_simulator.simulator import CitySimulator
        from apps.pollution.models import AQIReading
        sim = CitySimulator()
        count = sim.simulate_pollution()
        assert count >= 1
        assert AQIReading.objects.filter(station=aqi_station).exists()

    def test_full_tick_runs_all_domains(self, traffic_zone, waste_bin, aqi_station):
        from apps.iot_simulator.simulator import CitySimulator
        sim = CitySimulator()
        results = sim.tick()
        assert "traffic" in results
        assert "waste" in results
        assert "water" in results
        assert "electricity" in results
        assert "transport" in results
        assert "pollution" in results
        assert "timestamp" in results

    def test_density_stays_in_valid_range(self, traffic_zone):
        from apps.iot_simulator.simulator import CitySimulator
        from apps.traffic.models import TrafficReading
        sim = CitySimulator()
        for _ in range(20):  # Run 20 ticks
            sim.simulate_traffic()
        readings = TrafficReading.objects.filter(zone=traffic_zone)
        for reading in readings:
            assert 0 <= reading.density <= 100

    def test_simulator_reset_clears_readings(self, traffic_zone, waste_bin, aqi_station):
        from apps.iot_simulator.simulator import CitySimulator
        from apps.traffic.models import TrafficReading
        from apps.waste.models import WasteBinReading
        sim = CitySimulator()
        sim.tick()
        assert TrafficReading.objects.exists()
        sim.reset()
        assert not TrafficReading.objects.exists()
        assert not WasteBinReading.objects.exists()


@pytest.mark.django_db
class TestSimulatorAPI:
    def test_admin_can_trigger_tick(self, admin_client, traffic_zone):
        from django.urls import reverse
        url = reverse("simulator-trigger")
        response = admin_client.post(url)
        assert response.status_code == 200
        assert response.data["success"] is True

    def test_citizen_cannot_trigger_simulator(self, citizen_client):
        from django.urls import reverse
        url = reverse("simulator-trigger")
        response = citizen_client.post(url)
        assert response.status_code == 403

    def test_admin_can_reset_simulator(self, admin_client):
        from django.urls import reverse
        url = reverse("simulator-reset")
        response = admin_client.post(url)
        assert response.status_code == 200
