"""
Management command: seed_data
Seeds the database with realistic demo data for all departments.

Usage:
    python manage.py seed_data
    python manage.py seed_data --reset   (clears existing seed data first)
"""
import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import Role, Department, CustomUser, UserProfile
from apps.traffic.models import TrafficZone
from apps.waste.models import WasteBin
from apps.water.models import WaterSource
from apps.electricity.models import GridZone
from apps.transport.models import BusRoute, BusStop, Bus
from apps.emergency.models import EmergencyContact, Responder
from apps.pollution.models import AQIStation


class Command(BaseCommand):
    help = "Seed the CityOS database with demo data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing seed data before seeding.",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write(self.style.WARNING("Resetting seed data..."))
            self._reset()

        self._seed_roles()
        self._seed_departments()
        self._seed_users()
        self._seed_traffic_zones()
        self._seed_waste_bins()
        self._seed_water_sources()
        self._seed_grid_zones()
        self._seed_transport()
        self._seed_emergency_contacts()
        self._seed_responders()
        self._seed_aqi_stations()

        self.stdout.write(self.style.SUCCESS("[SUCCESS] Seed data created successfully!"))
        self.stdout.write("")
        self.stdout.write("Demo accounts:")
        self.stdout.write("  Super Admin:  admin@cityos.gov / Admin@1234")
        self.stdout.write("  Officer:      officer@cityos.gov / Officer@1234")
        self.stdout.write("  Field Worker: worker@cityos.gov / Worker@1234")
        self.stdout.write("  Citizen:      citizen@cityos.gov / Citizen@1234")

    def _reset(self):
        CustomUser.objects.filter(email__endswith="@cityos.gov").delete()
        TrafficZone.objects.all().delete()
        WasteBin.objects.all().delete()
        WaterSource.objects.all().delete()
        GridZone.objects.all().delete()
        BusRoute.objects.all().delete()
        EmergencyContact.objects.all().delete()
        Responder.objects.all().delete()
        AQIStation.objects.all().delete()

    def _seed_roles(self):
        roles = [
            (Role.CITIZEN, "City citizens who can submit complaints and access public data."),
            (Role.OFFICER, "Department officers who manage and assign complaints."),
            (Role.FIELD_WORKER, "Field workers who execute assigned tasks on site."),
            (Role.SUPER_ADMIN, "System administrator with full access."),
        ]
        for name, desc in roles:
            Role.objects.get_or_create(name=name, defaults={"description": desc})
        self.stdout.write("  - Roles")

    def _seed_departments(self):
        depts = [
            ("Traffic Management", Department.TRAFFIC, "traffic@cityos.gov"),
            ("Waste Management", Department.WASTE, "waste@cityos.gov"),
            ("Water Supply", Department.WATER, "water@cityos.gov"),
            ("Electricity & Power", Department.ELECTRICITY, "electricity@cityos.gov"),
            ("Public Transport", Department.TRANSPORT, "transport@cityos.gov"),
            ("Emergency Services", Department.EMERGENCY, "emergency@cityos.gov"),
            ("Pollution Control", Department.POLLUTION, "pollution@cityos.gov"),
            ("Citizen Services", Department.CITIZEN_SERVICES, "services@cityos.gov"),
        ]
        for name, code, email in depts:
            Department.objects.get_or_create(
                code=code, defaults={"name": name, "contact_email": email}
            )
        self.stdout.write("  - Departments")

    def _seed_users(self):
        admin_role = Role.objects.get(name=Role.SUPER_ADMIN)
        officer_role = Role.objects.get(name=Role.OFFICER)
        worker_role = Role.objects.get(name=Role.FIELD_WORKER)
        citizen_role = Role.objects.get(name=Role.CITIZEN)
        traffic_dept = Department.objects.get(code=Department.TRAFFIC)

        users = [
            ("admin@cityos.gov", "admin", "System", "Administrator", admin_role, None, "Admin@1234"),
            ("officer@cityos.gov", "officer_traffic", "Raj", "Sharma", officer_role, traffic_dept, "Officer@1234"),
            ("worker@cityos.gov", "worker_01", "Suresh", "Kumar", worker_role, traffic_dept, "Worker@1234"),
            ("citizen@cityos.gov", "citizen_01", "Priya", "Patel", citizen_role, None, "Citizen@1234"),
        ]

        for email, username, first, last, role, dept, pwd in users:
            if not CustomUser.objects.filter(email=email).exists():
                user = CustomUser.objects.create_user(
                    email=email,
                    username=username,
                    password=pwd,
                    first_name=first,
                    last_name=last,
                    role=role,
                    department=dept,
                )
                UserProfile.objects.get_or_create(user=user)
        self.stdout.write("  - Demo users")

    def _seed_traffic_zones(self):
        zones = [
            ("MG Road Junction", "MGR-01", 28.6315, 77.2167, "ARTERIAL", 60),
            ("Connaught Place", "CP-01", 28.6293, 77.2079, "LOCAL", 30),
            ("NH-48 Expressway", "NH48-01", 28.5000, 77.0500, "HIGHWAY", 100),
            ("Dwarka Sector 21", "DWK-21", 28.5528, 77.0588, "ARTERIAL", 60),
            ("Karol Bagh Market", "KB-01", 28.6519, 77.1906, "LOCAL", 30),
        ]
        for name, code, lat, lng, road_type, limit in zones:
            TrafficZone.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "road_type": road_type,
                    "speed_limit_kmh": limit,
                },
            )
        self.stdout.write("  - Traffic zones")

    def _seed_waste_bins(self):
        bins_data = [
            ("Bin A - Sector 1", "GENERAL", 28.6350, 77.2200, "Sector 1 Main Road"),
            ("Bin B - Market", "RECYCLABLE", 28.6400, 77.2100, "Old Delhi Market"),
            ("Bin C - Park", "ORGANIC", 28.6500, 77.2300, "Central Park Gate"),
            ("Bin D - Hospital", "HAZARDOUS", 28.6250, 77.2050, "City Hospital"),
            ("Bin E - Residential", "GENERAL", 28.6600, 77.2250, "Residential Block 5"),
        ]
        for name, bin_type, lat, lng, address in bins_data:
            WasteBin.objects.get_or_create(
                name=name,
                defaults={
                    "bin_type": bin_type,
                    "address": address,
                    "capacity_liters": 200,
                },
            )
        self.stdout.write("  - Waste bins")

    def _seed_water_sources(self):
        sources = [
            ("North Reservoir", "RESERVOIR", 28.7000, 77.1500, 50.0),
            ("East Treatment Plant", "TREATMENT_PLANT", 28.6500, 77.3000, 30.0),
            ("Central Borewell", "BOREWELL", 28.6300, 77.2200, 5.0),
        ]
        for name, source_type, lat, lng, capacity in sources:
            WaterSource.objects.get_or_create(
                name=name,
                defaults={
                    "source_type": source_type,
                    "capacity_million_liters": Decimal(str(capacity)),
                },
            )
        self.stdout.write("  - Water sources")

    def _seed_grid_zones(self):
        grid_zones = [
            ("North Grid Zone", "NGRID-01", 28.7200, 77.2000, 5000, 12000),
            ("South Grid Zone", "SGRID-01", 28.5800, 77.1800, 4000, 8000),
            ("East Grid Zone", "EGRID-01", 28.6300, 77.3500, 3500, 7000),
        ]
        for name, code, lat, lng, max_load, consumers in grid_zones:
            GridZone.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "max_load_kw": Decimal(str(max_load)),
                    "total_consumers": consumers,
                },
            )
        self.stdout.write("  - Grid zones")

    def _seed_transport(self):
        routes_data = [
            ("101", "Route 101 — ISBT to Airport", "ISBT Kashmiri Gate", "IGI Airport T3", 28.5, 45.0),
            ("202", "Route 202 — Dwarka to Connaught Place", "Dwarka Sec 21", "Connaught Place", 22.0, 30.0),
        ]
        for route_num, name, origin, dest, dist, fare in routes_data:
            route, _ = BusRoute.objects.get_or_create(
                route_number=route_num,
                defaults={
                    "name": name,
                    "origin": origin,
                    "destination": dest,
                    "distance_km": Decimal(str(dist)),
                    "fare_inr": Decimal(str(fare)),
                },
            )
            # Add stops
            stops = [
                (f"{origin}", 28.6712, 77.2284, 1),
                (f"Mid Stop A", 28.6400, 77.2000, 2),
                (f"{dest}", 28.5562, 77.1000, 3),
            ]
            for stop_name, lat, lng, order in stops:
                BusStop.objects.get_or_create(
                    route=route,
                    stop_order=order,
                    defaults={
                        "name": stop_name,
                    },
                )

            # Add a bus
            Bus.objects.get_or_create(
                registration_number=f"DL-{route_num}-BUS",
                defaults={"route": route, "capacity": 50, "driver_name": f"Driver {route_num}"},
            )
        self.stdout.write("  - Bus routes & buses")

    def _seed_emergency_contacts(self):
        contacts = [
            ("Police Control Room", "100", "POLICE"),
            ("Fire Brigade", "101", "FIRE"),
            ("Ambulance", "102", "AMBULANCE"),
            ("Disaster Management", "108", "DISASTER"),
            ("City Helpline", "1800-000-0000", "HELPLINE"),
        ]
        for name, phone, contact_type in contacts:
            EmergencyContact.objects.get_or_create(
                phone=phone, defaults={"name": name, "type": contact_type}
            )
        self.stdout.write("  - Emergency contacts")

    def _seed_responders(self):
        responders = [
            ("POLICE-01", "POLICE"),
            ("FIRE-01", "FIRE"),
            ("AMB-01", "AMBULANCE"),
            ("RESCUE-01", "RESCUE"),
        ]
        for code, resp_type in responders:
            Responder.objects.get_or_create(
                unit_code=code,
                defaults={
                    "responder_type": resp_type,
                    "status": "AVAILABLE",
                },
            )
        self.stdout.write("  - Emergency responders")

    def _seed_aqi_stations(self):
        stations = [
            ("Station North", 28.7200, 77.2000, "North Delhi"),
            ("Station South", 28.5600, 77.2100, "South Delhi"),
            ("Station Centre", 28.6300, 77.2200, "Central Delhi"),
            ("Station East", 28.6200, 77.3500, "East Delhi"),
        ]
        for name, lat, lng, area in stations:
            AQIStation.objects.get_or_create(
                name=name,
                defaults={
                    "area_name": area,
                },
            )
        self.stdout.write("  - AQI stations")
