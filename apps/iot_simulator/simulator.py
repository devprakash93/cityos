"""
apps/iot_simulator/simulator.py
================================
Core IoT simulation engine.
Writes realistic sensor readings to MySQL as if coming from real devices.
Each tick() call updates all domains: traffic, waste, water, electricity, transport, pollution.

Usage:
    from apps.iot_simulator.simulator import CitySimulator
    sim = CitySimulator()
    sim.tick()
"""
import random
import math
from decimal import Decimal
from django.utils import timezone

from apps.traffic.models import TrafficZone, TrafficReading, TrafficIncident
from apps.waste.models import WasteBin, WasteBinReading
from apps.water.models import WaterSource, WaterReading, WaterAlert
from apps.electricity.models import GridZone, ElectricityReading, PowerOutage
from apps.transport.models import Bus, BusLocation
from apps.pollution.models import AQIStation, AQIReading, PollutionAlert
from core.utils import calculate_aqi


class CitySimulator:
    """
    Deterministic-then-random IoT simulator.
    Each call to tick() produces one round of sensor readings across the city.
    """

    # ------------------------------------------------------------------ #
    # Traffic
    # ------------------------------------------------------------------ #
    def simulate_traffic(self):
        """
        For each active traffic zone:
        - Randomly walk density ±5 points (capped 0–100)
        - Derive congestion level and average speed
        - 2% chance of creating a new active incident
        """
        zones = TrafficZone.objects.filter(is_active=True)
        readings = []
        for zone in zones:
            # Get last reading or start at 30
            last = zone.readings.order_by("-recorded_at").first()
            current_density = last.density if last else 30

            # Random walk
            new_density = int(max(0, min(100, current_density + random.randint(-5, 5))))

            # Derive congestion
            if new_density <= 25:
                congestion = "FREE"
                speed = Decimal(str(random.uniform(70, 90)))
            elif new_density <= 50:
                congestion = "MODERATE"
                speed = Decimal(str(random.uniform(45, 70)))
            elif new_density <= 75:
                congestion = "HEAVY"
                speed = Decimal(str(random.uniform(20, 45)))
            else:
                congestion = "JAMMED"
                speed = Decimal(str(random.uniform(5, 20)))

            incident_flag = random.random() < 0.02  # 2% chance

            readings.append(TrafficReading(is_demo=True, data_source="SIMULATOR", 
                zone=zone,
                density=new_density,
                avg_speed_kmh=speed,
                congestion_level=congestion,
                incident_flag=incident_flag,
            ))

            # Occasionally create actual incident record
            if incident_flag and random.random() < 0.5:
                incident_types = ["ACCIDENT", "BREAKDOWN", "OBSTRUCTION"]
                TrafficIncident.objects.create(is_demo=True, data_source="SIMULATOR", 
                    zone=zone,
                    incident_type=random.choice(incident_types),
                    description="Auto-detected by IoT sensor.",
                    location_lat=zone.zone.center_lat if hasattr(zone.zone, "center_lat") else 20.2961,
                    location_lng=zone.zone.center_lng if hasattr(zone.zone, "center_lng") else 85.8245,
                    status="ACTIVE",
                )

        TrafficReading.objects.bulk_create(readings)
        return len(readings)

    # ------------------------------------------------------------------ #
    # Waste
    # ------------------------------------------------------------------ #
    def simulate_waste(self):
        """
        For each active bin:
        - Increment fill by 0–3% per tick
        - Trigger alert at >= 80% and send notification
        """
        bins = WasteBin.objects.filter(is_active=True)
        readings = []
        for bin_obj in bins:
            last = bin_obj.readings.order_by("-recorded_at").first()
            current_fill = last.fill_percent if last else random.randint(10, 50)
            current_battery = last.battery_percent if last else 100

            new_fill = min(100, current_fill + random.randint(0, 3))
            new_battery = max(0, current_battery - random.randint(0, 1))

            alert = new_fill >= 80

            readings.append(WasteBinReading(is_demo=True, data_source="SIMULATOR", 
                bin=bin_obj,
                fill_percent=new_fill,
                battery_percent=new_battery,
                alert_triggered=alert,
            ))

            # Send notification on threshold crossing (was < 80, now >= 80)
            if alert and (not last or not last.alert_triggered):
                from apps.notifications.services import NotificationService
                NotificationService.notify_iot_alert(
                    department_code="WASTE",
                    title=f"Waste Bin Full: {bin_obj.name}",
                    message=(
                        f"Bin '{bin_obj.name}' at {bin_obj.address} is {new_fill}% full. "
                        f"Collection required."
                    ),
                    related_object=bin_obj,
                )

        WasteBinReading.objects.bulk_create(readings)
        return len(readings)

    # ------------------------------------------------------------------ #
    # Water
    # ------------------------------------------------------------------ #
    def simulate_water(self):
        """
        For each active water source:
        - Fluctuate level, pH, turbidity, flow rate
        - Alert on low level (<20%) or high turbidity (>4 NTU)
        """
        sources = WaterSource.objects.filter(is_active=True)
        readings = []
        for source in sources:
            last = source.readings.order_by("-recorded_at").first()
            level = float(last.level_percent) if last else random.uniform(60, 80)
            ph = float(last.ph) if (last and last.ph) else 7.2
            turbidity = float(last.turbidity_ntu) if (last and last.turbidity_ntu) else 1.0

            # Natural fluctuation
            level = max(5, min(100, level + random.uniform(-0.5, 0.3)))
            ph = max(6.5, min(8.5, ph + random.uniform(-0.05, 0.05)))
            turbidity = max(0.1, min(10, turbidity + random.uniform(-0.2, 0.3)))
            flow_rate = Decimal(str(max(0, random.uniform(80, 200))))

            reading = WaterReading(is_demo=True, data_source="SIMULATOR", 
                source=source,
                level_percent=Decimal(str(round(level, 2))),
                ph=Decimal(str(round(ph, 2))),
                turbidity_ntu=Decimal(str(round(turbidity, 2))),
                flow_rate_lps=flow_rate,
                chlorine_ppm=Decimal(str(round(random.uniform(0.2, 0.5), 3))),
            )
            readings.append(reading)

            # Low water level alert
            if level < 20 and (not last or float(last.level_percent) >= 20):
                WaterAlert.objects.create(is_demo=True, data_source="SIMULATOR", 
                    source=source,
                    alert_type="LOW_LEVEL",
                    message=f"{source.name} is at {level:.1f}% capacity. Refill urgently.",
                )
                from apps.notifications.services import NotificationService
                NotificationService.notify_iot_alert(
                    department_code="WATER",
                    title=f"Low Water Level: {source.name}",
                    message=f"{source.name} is critically low at {level:.1f}%.",
                    related_object=source,
                )

        WaterReading.objects.bulk_create(readings)
        return len(readings)

    # ------------------------------------------------------------------ #
    # Electricity
    # ------------------------------------------------------------------ #
    def simulate_electricity(self):
        """
        For each active grid zone:
        - Fluctuate load, derive voltage and current
        - Create outage record on overload (>95%)
        """
        zones = GridZone.objects.filter(is_active=True)
        readings = []
        for zone in zones:
            last = zone.readings.order_by("-recorded_at").first()
            current_load = float(last.load_kw) if last else float(zone.max_load_kw) * 0.6

            max_load = float(zone.max_load_kw)
            new_load = max(0, min(max_load * 1.1, current_load + random.uniform(-50, 80)))
            load_percent = round(new_load / max_load * 100, 2)

            voltage = Decimal(str(round(random.uniform(218, 242), 2)))
            current = Decimal(str(round(new_load * 1000 / 230, 2)))  # P = V*I approx
            overload = load_percent > 95

            readings.append(ElectricityReading(is_demo=True, data_source="SIMULATOR", 
                zone=zone,
                voltage_v=voltage,
                current_a=current,
                load_kw=Decimal(str(round(new_load, 2))),
                load_percent=Decimal(str(load_percent)),
                frequency_hz=Decimal(str(round(random.uniform(49.8, 50.2), 2))),
                overload_flag=overload,
            ))

            # Create outage on first overload
            if overload and not PowerOutage.objects.filter(zone=zone, status="ACTIVE").exists():
                PowerOutage.objects.create(is_demo=True, data_source="SIMULATOR", 
                    zone=zone,
                    cause="OVERLOAD",
                    description=f"Auto-detected overload at {load_percent:.1f}%.",
                    affected_households=int(zone.total_consumers * 0.3),
                    status="ACTIVE",
                )
                from apps.notifications.services import NotificationService
                NotificationService.notify_iot_alert(
                    department_code="ELECTRICITY",
                    title=f"Grid Overload: {zone.name}",
                    message=f"Zone {zone.name} is at {load_percent:.1f}% load. Outage risk.",
                    related_object=zone,
                )

        ElectricityReading.objects.bulk_create(readings)
        return len(readings)

    # ------------------------------------------------------------------ #
    # Transport (Bus GPS)
    # ------------------------------------------------------------------ #
    def simulate_transport(self):
        """
        Move each active bus a short distance along its route.
        Randomise occupancy.
        """
        buses = Bus.objects.filter(is_active=True).select_related("route")
        locations = []
        for bus in buses:
            last = bus.locations.order_by("-recorded_at").first()
            if last:
                lat = float(last.location_lat) + random.uniform(-0.001, 0.001)
                lng = float(last.location_lng) + random.uniform(-0.001, 0.001)
            else:
                # Default position — Bhubaneswar placeholder (approximate center)
                lat = 20.2961 + random.uniform(-0.05, 0.05)
                lng = 85.8245 + random.uniform(-0.05, 0.05)

            occupancy = max(0, min(100, (int(last.occupancy_percent) if last else 30) + random.randint(-5, 10)))
            speed = Decimal(str(random.uniform(0, 60)))

            locations.append(BusLocation(is_demo=True, data_source="SIMULATOR", 
                bus=bus,
                location_lat=Decimal(str(round(lat, 6))),
                location_lng=Decimal(str(round(lng, 6))),
                speed_kmh=speed,
                occupancy_percent=occupancy,
            ))

        BusLocation.objects.bulk_create(locations)
        return len(locations)

    # ------------------------------------------------------------------ #
    # Pollution (AQI)
    # ------------------------------------------------------------------ #
    def simulate_pollution(self):
        """
        For each AQI station, update pollutant readings and recalculate AQI.
        Alert when AQI category crosses UNHEALTHY threshold.
        """
        stations = AQIStation.objects.filter(is_active=True)
        readings = []
        for station in stations:
            last = station.readings.order_by("-recorded_at").first()

            pm25 = float(last.pm25) if last else random.uniform(20, 80)
            pm10 = float(last.pm10) if last else random.uniform(40, 120)
            co2 = float(last.co2) if (last and last.co2) else 400.0
            no2 = float(last.no2) if (last and last.no2) else 20.0
            so2 = float(last.so2) if (last and last.so2) else 10.0

            pm25 = max(0, pm25 + random.uniform(-3, 5))
            pm10 = max(0, pm10 + random.uniform(-5, 8))
            co2 = max(350, co2 + random.uniform(-2, 4))
            no2 = max(0, no2 + random.uniform(-1, 2))
            so2 = max(0, so2 + random.uniform(-0.5, 1))

            aqi_value, category = calculate_aqi(pm25, pm10, co2, no2, so2)

            readings.append(AQIReading(is_demo=True, data_source="SIMULATOR", 
                station=station,
                pm25=Decimal(str(round(pm25, 2))),
                pm10=Decimal(str(round(pm10, 2))),
                co2=Decimal(str(round(co2, 2))),
                no2=Decimal(str(round(no2, 2))),
                so2=Decimal(str(round(so2, 2))),
                aqi_value=Decimal(str(aqi_value)),
                category=category,
            ))

            # Pollution alert on UNHEALTHY+
            was_safe = (not last) or (last.category in ("GOOD", "MODERATE"))
            now_unhealthy = category not in ("GOOD", "MODERATE")
            if now_unhealthy and was_safe:
                PollutionAlert.objects.create(is_demo=True, data_source="SIMULATOR", 
                    station=station,
                    aqi_value=Decimal(str(aqi_value)),
                    category=category,
                    message=f"AQI at {station.name} has reached {aqi_value} ({category}).",
                )
                from apps.notifications.services import NotificationService
                NotificationService.notify_iot_alert(
                    department_code="POLLUTION",
                    title=f"Air Quality Alert: {station.name}",
                    message=f"AQI is {aqi_value} ({category}). Sensitive groups should stay indoors.",
                    related_object=station,
                )

        AQIReading.objects.bulk_create(readings)
        return len(readings)

    # ------------------------------------------------------------------ #
    # Main tick
    # ------------------------------------------------------------------ #
    def tick(self) -> dict:
        """
        Execute one simulation tick across all domains.
        Returns a summary dict with the number of records written per domain.
        """
        results = {
            "traffic": self.simulate_traffic(),
            "waste": self.simulate_waste(),
            "water": self.simulate_water(),
            "electricity": self.simulate_electricity(),
            "transport": self.simulate_transport(),
            "pollution": self.simulate_pollution(),
            "timestamp": timezone.now().isoformat(),
        }
        return results

    def reset(self) -> None:
        """
        Delete all IoT readings to reset the simulator to a clean state.
        Does NOT delete zones, sources, or infrastructure records.
        """
        from apps.traffic.models import TrafficReading
        from apps.waste.models import WasteBinReading
        from apps.water.models import WaterReading
        from apps.electricity.models import ElectricityReading
        from apps.transport.models import BusLocation
        from apps.pollution.models import AQIReading

        TrafficReading.objects.all().delete()
        WasteBinReading.objects.all().delete()
        WaterReading.objects.all().delete()
        ElectricityReading.objects.all().delete()
        BusLocation.objects.all().delete()
        AQIReading.objects.all().delete()

    def process_event(self, event) -> None:
        """
        Process a specific explicit simulation event triggered by an Admin.
        """
        from apps.traffic.models import TrafficIncident, TrafficZone
        from apps.waste.models import WasteBin, WasteBinReading
        from apps.water.models import WaterSource, WaterAlert
        from apps.electricity.models import GridZone, PowerOutage
        from apps.transport.models import Bus, BusLocation
        from apps.pollution.models import AQIStation, PollutionAlert
        from apps.emergency.models import EmergencyIncident
        from apps.notifications.services import NotificationService
        import random
        from decimal import Decimal

        if event.event_type == "TRAFFIC_ACCIDENT":
            zone = TrafficZone.objects.filter(is_active=True, zone__city=event.city).first()
            if zone:
                incident = TrafficIncident.objects.create(
                    zone=zone,
                    incident_type="ACCIDENT",
                    description=f"Auto-detected traffic accident due to simulator event.",
                    location_lat=zone.zone.center_lat if hasattr(zone.zone, "center_lat") else Decimal("20.2961"),
                    location_lng=zone.zone.center_lng if hasattr(zone.zone, "center_lng") else Decimal("85.8245"),
                    status="ACTIVE",
                    is_demo=True,
                    data_source="SIMULATOR"
                )
                NotificationService.notify_iot_alert(
                    department_code="TRAFFIC",
                    title=f"Traffic Accident: {zone.name}",
                    message="Major traffic accident detected.",
                    related_object=incident
                )
        
        elif event.event_type == "BIN_FULL":
            bin_obj = WasteBin.objects.filter(is_active=True, location__city=event.city).first()
            if bin_obj:
                WasteBinReading.objects.create(
                    bin=bin_obj, fill_percent=100, battery_percent=95, alert_triggered=True,
                    is_demo=True, data_source="SIMULATOR"
                )
                NotificationService.notify_iot_alert(
                    department_code="WASTE",
                    title=f"Waste Bin Full: {bin_obj.name}",
                    message=f"Bin at {bin_obj.location.address if bin_obj.location else 'Unknown'} is completely full.",
                    related_object=bin_obj
                )
        
        elif event.event_type == "WATER_LEAKAGE":
            source = WaterSource.objects.filter(is_active=True, location__city=event.city).first()
            if source:
                alert = WaterAlert.objects.create(
                    source=source, alert_type="LOW_LEVEL", message="Major leakage detected, level dropping rapidly.",
                    is_demo=True, data_source="SIMULATOR"
                )
                NotificationService.notify_iot_alert(
                    department_code="WATER",
                    title=f"Water Leakage: {source.name}",
                    message="Major leakage detected in the distribution network.",
                    related_object=source
                )

        elif event.event_type == "POWER_OUTAGE":
            zone = GridZone.objects.filter(is_active=True, zone__city=event.city).first()
            if zone:
                outage = PowerOutage.objects.create(
                    zone=zone, cause="EQUIPMENT_FAILURE", description="Simulated power outage.",
                    affected_households=zone.total_consumers, status="ACTIVE",
                    is_demo=True, data_source="SIMULATOR"
                )
                NotificationService.notify_iot_alert(
                    department_code="ELECTRICITY",
                    title=f"Power Outage: {zone.name}",
                    message="Total power failure in zone.",
                    related_object=zone
                )

        elif event.event_type == "BUS_BREAKDOWN":
            bus = Bus.objects.filter(is_active=True, route__city=event.city).first()
            if bus:
                last_loc = bus.locations.order_by("-recorded_at").first()
                if last_loc:
                    BusLocation.objects.create(
                        bus=bus, location_lat=last_loc.location_lat, location_lng=last_loc.location_lng,
                        speed_kmh=0, occupancy_percent=last_loc.occupancy_percent,
                        is_demo=True, data_source="SIMULATOR"
                    )
                NotificationService.notify_iot_alert(
                    department_code="TRANSPORT",
                    title=f"Bus Breakdown: {bus.registration_number}",
                    message="Bus has broken down and requires towing.",
                    related_object=bus
                )

        elif event.event_type == "AQI_HIGH":
            station = AQIStation.objects.filter(is_active=True, location__city=event.city).first()
            if station:
                alert = PollutionAlert.objects.create(
                    station=station, aqi_value=Decimal("450.00"), category="HAZARDOUS",
                    message="Simulated hazardous pollution levels.",
                    is_demo=True, data_source="SIMULATOR"
                )
                NotificationService.notify_iot_alert(
                    department_code="POLLUTION",
                    title=f"Hazardous AQI: {station.name}",
                    message="AQI spiked to 450. Immediate action required.",
                    related_object=station
                )

        elif event.event_type == "EMERGENCY":
            EmergencyIncident.objects.create(
                incident_type="OTHER", severity="HIGH", title="Simulated Emergency",
                description=event.payload.get("description", "A simulated emergency event occurred."),
                status="REPORTED", is_demo=True, data_source="SIMULATOR"
            )
            # Notification is usually handled by signals on EmergencyIncident creation
            
        elif event.event_type == "CYCLONE":
            EmergencyIncident.objects.create(
                incident_type="OTHER", severity="CRITICAL", title="Simulated Cyclone Alert",
                description="Simulated cyclone approach.",
                status="REPORTED", is_demo=True, data_source="SIMULATOR"
            )
