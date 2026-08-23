"""
Management command: seed_cityos
=================================
Comprehensive seed for the Odisha CityOS demo database.

Populates:
  - All 30 Odisha districts (real coordinates)
  - Major cities, zones, wards for 8 key cities
  - Roles, departments, demo users (admin/officer/worker/citizen)
  - SLA configurations
  - Traffic zones with Odisha GPS coords
  - Waste bins across cities
  - Water sources across cities
  - Electricity grid zones
  - 10 bus routes with stops and 25+ buses
  - Initial bus GPS locations
  - AQI monitoring stations
  - Emergency contacts, responders, facilities
  - Emergency incidents and alerts
  - 50 realistic complaints
  - Complaint assignments (worker linked to complaint)
  - Complaint history entries
  - IoT sensor readings (so charts have data immediately)
  - Announcements

Usage:
    python manage.py seed_cityos
    python manage.py seed_cityos --reset
"""
import random
from decimal import Decimal
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Comprehensive Odisha CityOS database seed."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset", action="store_true",
            help="Clear existing seed data before re-seeding.",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write(self.style.WARNING("[RESET] Clearing seed data..."))
            self._reset()

        self.stdout.write("Seeding Odisha CityOS database...")

        self._seed_roles()
        self._seed_departments()
        state, districts = self._seed_geography()
        cities = self._seed_cities_zones_wards(districts)
        self._seed_users(cities)
        self._seed_sla_configs()
        self._seed_traffic_zones(cities)
        self._seed_waste_bins(cities)
        self._seed_water_sources(cities)
        self._seed_grid_zones(cities)
        routes = self._seed_transport(cities)
        self._seed_aqi_stations(cities)
        self._seed_emergency_contacts()
        self._seed_responders(cities)
        self._seed_facilities(cities, districts)
        self._seed_emergency_incidents(cities)
        self._seed_emergency_alerts(cities)
        self._seed_complaints(cities)
        self._seed_water_schedules_notices(cities)
        self._seed_announcements(cities)
        self._seed_iot_readings()

        self.stdout.write(self.style.SUCCESS("\n[OK] seed_cityos complete!\n"))
        self.stdout.write("Demo accounts:")
        self.stdout.write("  Super Admin:     admin@cityos.gov   / Admin@1234")
        self.stdout.write("  Officer:         officer@cityos.gov / Officer@1234")
        self.stdout.write("  Field Worker:    worker@cityos.gov  / Worker@1234")
        self.stdout.write("  Citizen:         citizen@cityos.gov / Citizen@1234")

    # ================================================================
    # RESET
    # ================================================================
    def _reset(self):
        from apps.geography.models import State
        from apps.accounts.models import CustomUser
        from apps.traffic.models import TrafficZone, TrafficReading, TrafficIncident
        from apps.waste.models import WasteBin, WasteBinReading
        from apps.water.models import WaterSource, WaterReading
        from apps.electricity.models import GridZone, ElectricityReading, PowerOutage
        from apps.transport.models import BusRoute, Bus, BusLocation
        from apps.pollution.models import AQIStation, AQIReading
        from apps.emergency.models import EmergencyContact, Responder, EmergencyIncident, EmergencyAlert
        from apps.complaints.models import Complaint, SLAConfiguration
        from apps.notifications.models import Notification, Announcement
        from apps.geography.models import Facility

        Notification.objects.all().delete()
        Announcement.objects.all().delete()
        Complaint.objects.all().delete()
        SLAConfiguration.objects.all().delete()
        EmergencyAlert.objects.all().delete()
        EmergencyIncident.objects.all().delete()
        EmergencyContact.objects.all().delete()
        Responder.objects.all().delete()
        Facility.objects.all().delete()
        AQIReading.objects.all().delete()
        AQIStation.objects.all().delete()
        BusLocation.objects.all().delete()
        Bus.objects.all().delete()
        BusRoute.objects.all().delete()
        PowerOutage.objects.all().delete()
        ElectricityReading.objects.all().delete()
        GridZone.objects.all().delete()
        WaterReading.objects.all().delete()
        WaterSource.objects.all().delete()
        WasteBinReading.objects.all().delete()
        WasteBin.objects.all().delete()
        TrafficIncident.objects.all().delete()
        TrafficReading.objects.all().delete()
        TrafficZone.objects.all().delete()
        CustomUser.objects.filter(email__endswith="@cityos.gov").delete()
        State.objects.all().delete()
        self.stdout.write("  [DONE] Reset complete")

    # ================================================================
    # ROLES
    # ================================================================
    def _seed_roles(self):
        from apps.accounts.models import Role
        for name, desc in [
            (Role.CITIZEN,      "City citizens — submit complaints, access public data."),
            (Role.OFFICER,      "Department officers — manage and assign complaints."),
            (Role.FIELD_WORKER, "Field workers — execute assigned tasks on site."),
            (Role.SUPER_ADMIN,  "System administrator — full access to all modules."),
        ]:
            Role.objects.get_or_create(name=name, defaults={"description": desc})
        self.stdout.write("  [OK] Roles")

    # ================================================================
    # DEPARTMENTS
    # ================================================================
    def _seed_departments(self):
        from apps.accounts.models import Department
        depts = [
            ("Traffic Management",   Department.TRAFFIC,          "traffic@cityos.gov",     "0671-2300100"),
            ("Waste Management",     Department.WASTE,            "waste@cityos.gov",        "0671-2300200"),
            ("Water Supply",         Department.WATER,            "water@cityos.gov",        "0671-2300300"),
            ("Electricity & Power",  Department.ELECTRICITY,      "electricity@cityos.gov",  "0671-2300400"),
            ("Public Transport",     Department.TRANSPORT,        "transport@cityos.gov",    "0671-2300500"),
            ("Emergency Services",   Department.EMERGENCY,        "emergency@cityos.gov",    "0671-2300600"),
            ("Pollution Control",    Department.POLLUTION,        "pollution@cityos.gov",    "0671-2300700"),
            ("Citizen Services",     Department.CITIZEN_SERVICES, "services@cityos.gov",     "0671-2300800"),
        ]
        for name, code, email, phone in depts:
            Department.objects.get_or_create(
                code=code,
                defaults={"name": name, "contact_email": email, "contact_phone": phone}
            )
        self.stdout.write("  [OK] Departments")

    # ================================================================
    # GEOGRAPHY — all 30 Odisha districts
    # ================================================================
    def _seed_geography(self):
        from apps.geography.models import State, District

        state, _ = State.objects.get_or_create(
            code="OD",
            defaults={"name": "Odisha", "country": "India"}
        )

        DISTRICTS = [
            ("Angul",          20.8400, 85.1010),
            ("Balangir",       20.7070, 83.4900),
            ("Balasore",       21.4940, 86.9320),
            ("Bargarh",        21.3320, 83.6190),
            ("Bhadrak",        21.0540, 86.5120),
            ("Boudh",          20.8360, 84.3260),
            ("Cuttack",        20.4625, 85.8830),
            ("Deogarh",        21.5300, 84.7370),
            ("Dhenkanal",      20.6630, 85.5990),
            ("Gajapati",       18.7800, 84.0950),
            ("Ganjam",         19.3160, 84.7940),
            ("Jagatsinghpur",  20.2530, 86.1670),
            ("Jajpur",         20.8490, 86.3350),
            ("Jharsuguda",     21.8550, 84.0050),
            ("Kalahandi",      19.9070, 83.1670),
            ("Kandhamal",      20.4800, 84.2300),
            ("Kendrapara",     20.5000, 86.4160),
            ("Kendujhar",      21.6290, 85.5830),
            ("Khordha",        20.2961, 85.8245),
            ("Koraput",        18.8130, 82.7180),
            ("Malkangiri",     18.3480, 81.9340),
            ("Mayurbhanj",     21.9320, 86.7590),
            ("Nabarangpur",    19.2300, 82.5380),
            ("Nayagarh",       20.1280, 85.0950),
            ("Nuapada",        20.6110, 82.5310),
            ("Puri",           19.8100, 85.8310),
            ("Rayagada",       19.1720, 83.4120),
            ("Sambalpur",      21.4660, 83.9700),
            ("Subarnapur",     20.8320, 83.9000),
            ("Sundargarh",     22.1170, 84.0310),
        ]

        districts = {}
        for name, lat, lng in DISTRICTS:
            d, _ = District.objects.get_or_create(
                name=name, state=state,
                defaults={"latitude": Decimal(str(lat)), "longitude": Decimal(str(lng))}
            )
            districts[name] = d

        self.stdout.write(f"  [OK] {len(districts)} districts")
        return state, districts

    # ================================================================
    # CITIES, ZONES, WARDS
    # ================================================================
    def _seed_cities_zones_wards(self, districts):
        from apps.geography.models import City, Zone, Ward, Location

        # Key cities with full zone/ward data
        CITIES = [
            # (district_name, city_name, lat, lng, is_default, zones_list, ward_count)
            ("Cuttack",   "Cuttack",       20.4625, 85.8830, True,
             ["CDA", "Old Town", "Badambadi", "Chauliaganj"], 8),
            ("Khordha",   "Bhubaneswar",   20.2961, 85.8245, False,
             ["Old Town", "Nayapalli", "Patia", "Chandrasekharpur"], 10),
            ("Puri",      "Puri",          19.8100, 85.8310, False,
             ["Grand Road", "Beach Zone", "Mochi Sahi"], 5),
            ("Ganjam",    "Berhampur",     19.3160, 84.7940, False,
             ["Bada Bazar", "Engineering School Road", "Gandhi Nagar"], 6),
            ("Sambalpur", "Sambalpur",     21.4660, 83.9700, False,
             ["Ainthapali", "Khetrajpur", "Budharaja"], 5),
            ("Jharsuguda","Jharsuguda",    21.8550, 84.0050, False,
             ["Ward A", "Ward B", "Brajrajnagar"], 4),
            ("Balasore",  "Balasore",      21.4940, 86.9320, False,
             ["Hospital Road", "Town Zone", "Sahadevkhunta"], 4),
            ("Kendujhar", "Kendujhar",     21.6290, 85.5830, False,
             ["Central Zone", "New Colony"], 3),
        ]

        # Minimal city for remaining districts
        SIMPLE_CITIES = [
            ("Angul",         "Angul",          20.8400, 85.1010),
            ("Balangir",      "Balangir",        20.7070, 83.4900),
            ("Bargarh",       "Bargarh",         21.3320, 83.6190),
            ("Bhadrak",       "Bhadrak",         21.0540, 86.5120),
            ("Boudh",         "Boudh",           20.8360, 84.3260),
            ("Deogarh",       "Deogarh",         21.5300, 84.7370),
            ("Dhenkanal",     "Dhenkanal",       20.6630, 85.5990),
            ("Gajapati",      "Parlakhemundi",   18.7800, 84.0950),
            ("Jagatsinghpur", "Jagatsinghpur",   20.2530, 86.1670),
            ("Jajpur",        "Jajpur",          20.8490, 86.3350),
            ("Kalahandi",     "Bhawanipatna",    19.9070, 83.1670),
            ("Kandhamal",     "Phulbani",        20.4800, 84.2300),
            ("Kendrapara",    "Kendrapara",      20.5000, 86.4160),
            ("Koraput",       "Koraput",         18.8130, 82.7180),
            ("Malkangiri",    "Malkangiri",      18.3480, 81.9340),
            ("Mayurbhanj",     "Baripada",        21.9320, 86.7590),
            ("Nabarangpur",    "Nabarangpur",     19.2300, 82.5380),
            ("Nayagarh",       "Nayagarh",        20.1280, 85.0950),
            ("Nuapada",        "Nuapada",         20.6110, 82.5310),
            ("Rayagada",       "Rayagada",        19.1720, 83.4120),
            ("Subarnapur",     "Sonepur",         20.8320, 83.9000),
            ("Sundargarh",     "Sundargarh",      22.1170, 84.0310),
        ]

        cities = {}

        for dist_name, city_name, lat, lng, is_default, zone_names, ward_count in CITIES:
            dist = districts[dist_name]
            city, _ = City.objects.get_or_create(
                name=city_name, district=dist,
                defaults={"latitude": Decimal(str(lat)), "longitude": Decimal(str(lng)), "is_default": is_default}
            )
            cities[city_name] = city
            city.latitude = Decimal(str(lat))
            city.longitude = Decimal(str(lng))
            city.save()

            zones = []
            for z_name in zone_names:
                z, _ = Zone.objects.get_or_create(city=city, name=z_name)
                zones.append(z)

            for i in range(1, ward_count + 1):
                zone = zones[(i - 1) % len(zones)]
                Ward.objects.get_or_create(
                    city=city, number=i,
                    defaults={"name": f"Ward {i}", "zone": zone}
                )

        for dist_name, city_name, lat, lng in SIMPLE_CITIES:
            dist = districts[dist_name]
            city, _ = City.objects.get_or_create(
                name=city_name, district=dist,
                defaults={"latitude": Decimal(str(lat)), "longitude": Decimal(str(lng))}
            )
            cities[city_name] = city
            # Add a simple zone and 2 wards
            z, _ = Zone.objects.get_or_create(city=city, name="Central Zone")
            for i in range(1, 3):
                Ward.objects.get_or_create(city=city, number=i, defaults={"name": f"Ward {i}", "zone": z})

        total_cities = City.objects.count()
        total_zones = Zone.objects.count()
        total_wards = Ward.objects.count()
        self.stdout.write(f"  [OK] {total_cities} cities, {total_zones} zones, {total_wards} wards")
        return cities

    # ================================================================
    # USERS
    # ================================================================
    def _seed_users(self, cities):
        from apps.accounts.models import Role, Department, CustomUser, UserProfile

        admin_role    = Role.objects.get(name=Role.SUPER_ADMIN)
        officer_role  = Role.objects.get(name=Role.OFFICER)
        worker_role   = Role.objects.get(name=Role.FIELD_WORKER)
        citizen_role  = Role.objects.get(name=Role.CITIZEN)

        depts = {code: Department.objects.get(code=code) for code in [
            Department.CITIZEN_SERVICES, Department.TRAFFIC, Department.WASTE,
            Department.WATER, Department.ELECTRICITY, Department.TRANSPORT,
            Department.EMERGENCY, Department.POLLUTION,
        ]}

        # Core demo accounts
        USERS = [
            ("admin@cityos.gov",             "admin",           "System",   "Administrator", admin_role,   None,                       "Admin@1234"),
            ("citizen@cityos.gov",           "citizen_01",      "Priya",    "Patel",         citizen_role, None,                       "Citizen@1234"),
            ("officer@cityos.gov",           "officer_demo",    "Demo",     "Officer",       officer_role, depts[Department.CITIZEN_SERVICES], "Officer@1234"),
            ("worker@cityos.gov",            "worker_demo",     "Demo",     "Worker",        worker_role,  depts[Department.CITIZEN_SERVICES], "Worker@1234"),
            
            # OFFICERS
            ("traffic.officer@cityos.gov",   "raj_sharma",      "Raj",      "Sharma",        officer_role, depts[Department.TRAFFIC],    "Officer@1234"),
            ("water.officer@cityos.gov",     "anita_das",       "Anita",    "Das",           officer_role, depts[Department.WATER],      "Officer@1234"),
            ("waste.officer@cityos.gov",     "rahul_patnaik",   "Rahul",    "Patnaik",       officer_role, depts[Department.WASTE],      "Officer@1234"),
            ("electricity.officer@cityos.gov","priyanka_sahu",  "Priyanka", "Sahu",          officer_role, depts[Department.ELECTRICITY],"Officer@1234"),
            ("transport.officer@cityos.gov", "amit_kumar",      "Amit",     "Kumar",         officer_role, depts[Department.TRANSPORT],  "Officer@1234"),
            ("pollution.officer@cityos.gov", "neha_das",        "Neha",     "Das",           officer_role, depts[Department.POLLUTION],  "Officer@1234"),

            # FIELD WORKERS
            ("traffic.worker@cityos.gov",    "suresh_kumar",    "Suresh",   "Kumar",         worker_role,  depts[Department.TRAFFIC],    "Worker@1234"),
            ("water.worker@cityos.gov",      "ramesh_das",      "Ramesh",   "Das",           worker_role,  depts[Department.WATER],      "Worker@1234"),
            ("waste.worker@cityos.gov",      "bikash_nayak",    "Bikash",   "Nayak",         worker_role,  depts[Department.WASTE],      "Worker@1234"),
            ("electricity.worker@cityos.gov","manoj_sahu",      "Manoj",    "Sahu",          worker_role,  depts[Department.ELECTRICITY],"Worker@1234"),
            ("transport.worker@cityos.gov",  "deepak_rout",     "Deepak",   "Rout",          worker_role,  depts[Department.TRANSPORT],  "Worker@1234"),
            ("pollution.worker@cityos.gov",  "santosh_behera",  "Santosh",  "Behera",        worker_role,  depts[Department.POLLUTION],  "Worker@1234"),

            # Extra citizens
            ("citizen2@cityos.gov",          "citizen_02",      "Anita",    "Swain",         citizen_role, None,                       "Citizen@1234"),
            ("citizen3@cityos.gov",          "citizen_03",      "Mohan",    "Tripathy",      citizen_role, None,                       "Citizen@1234"),
            ("citizen4@cityos.gov",          "citizen_04",      "Lata",     "Pradhan",       citizen_role, None,                       "Citizen@1234"),
        ]

        for email, username, first, last, role, dept, pwd in USERS:
            if not CustomUser.objects.filter(email=email).exists():
                u = CustomUser.objects.create_user(
                    email=email, username=username, password=pwd,
                    first_name=first, last_name=last, role=role, department=dept,
                )
                UserProfile.objects.get_or_create(user=u)

        self.stdout.write(f"  [OK] {CustomUser.objects.count()} users")

    # ================================================================
    # SLA CONFIGURATIONS
    # ================================================================
    def _seed_sla_configs(self):
        from apps.complaints.models import SLAConfiguration

        configs = [
            # (priority, response_mins, resolution_mins)
            ("LOW",      240,  4320),   # 4h response, 72h resolution
            ("MEDIUM",   120,  2880),   # 2h response, 48h resolution
            ("HIGH",      60,  1440),   # 1h response, 24h resolution
            ("CRITICAL",  30,   240),   # 30m response, 4h resolution
        ]
        for priority, resp, resol in configs:
            SLAConfiguration.objects.get_or_create(
                priority=priority, category=None, department=None,
                defaults={"response_minutes": resp, "resolution_minutes": resol}
            )
        self.stdout.write("  [OK] SLA configurations")

    # ================================================================
    # TRAFFIC ZONES — Odisha coordinates
    # ================================================================
    def _seed_traffic_zones(self, cities):
        from apps.traffic.models import TrafficZone
        from apps.geography.models import Zone

        ZONES = [
            # (code, name, city_name, lat, lng, road_type, speed_limit)
            ("BBSR-NH16",   "NH-16 Bypass Bhubaneswar",       "Bhubaneswar", 20.3000, 85.8100, "HIGHWAY",   80),
            ("BBSR-MKT",    "Bhubaneswar Master Canteen Sq",  "Bhubaneswar", 20.2675, 85.8412, "ARTERIAL",  50),
            ("BBSR-ESPL",   "Bhubaneswar Esplanade",          "Bhubaneswar", 20.2947, 85.8312, "ARTERIAL",  50),
            ("BBSR-PATIA",  "Patia Square",                   "Bhubaneswar", 20.3519, 85.8195, "ARTERIAL",  50),
            ("CTC-NH55",    "Cuttack NH-55 Flyover",          "Cuttack",     20.4700, 85.9050, "HIGHWAY",   80),
            ("CTC-BAZAR",   "Cuttack Buxibazar",              "Cuttack",     20.4625, 85.8870, "LOCAL",     30),
            ("CTC-CDA",     "CDA Sector 6 Road",              "Cuttack",     20.4550, 85.8750, "ARTERIAL",  40),
            ("PURI-MAIN",   "Puri Grand Road",                "Puri",        19.8100, 85.8390, "ARTERIAL",  40),
            ("SAMB-MAIN",   "Sambalpur College Road",         "Sambalpur",   21.4660, 83.9700, "ARTERIAL",  40),
            ("BHRM-NH516",  "Berhampur NH-516 Junction",      "Berhampur",   19.3160, 84.8000, "HIGHWAY",   80),
        ]

        for code, name, city_name, lat, lng, road_type, limit in ZONES:
            city_obj = cities.get(city_name)
            geo_zone = Zone.objects.filter(city=city_obj).first() if city_obj else None
            TrafficZone.objects.get_or_create(
                code=code,
                defaults={
                    "name": name, "zone": geo_zone,
                    "road_type": road_type, "speed_limit_kmh": limit,
                }
            )
        self.stdout.write(f"  [OK] {TrafficZone.objects.count()} traffic zones")

    # ================================================================
    # WASTE BINS — Odisha locations
    # ================================================================
    def _seed_waste_bins(self, cities):
        from apps.waste.models import WasteBin
        from apps.geography.models import Location

        BINS = [
            # (name, bin_type, lat, lng, address, city_name)
            ("Bin-BBSR-01", "GENERAL",    20.2961, 85.8245, "Rajmahal Square, Bhubaneswar",         "Bhubaneswar"),
            ("Bin-BBSR-02", "RECYCLABLE", 20.3100, 85.8200, "Patia Market, Bhubaneswar",            "Bhubaneswar"),
            ("Bin-BBSR-03", "ORGANIC",    20.2675, 85.8412, "Master Canteen, Bhubaneswar",          "Bhubaneswar"),
            ("Bin-BBSR-04", "GENERAL",    20.2947, 85.8312, "Vani Vihar Road, Bhubaneswar",         "Bhubaneswar"),
            ("Bin-BBSR-05", "HAZARDOUS",  20.3519, 85.8195, "AIIMS Roundabout, Bhubaneswar",        "Bhubaneswar"),
            ("Bin-CTC-01",  "GENERAL",    20.4625, 85.8830, "CDA Sector 6, Cuttack",                "Cuttack"),
            ("Bin-CTC-02",  "RECYCLABLE", 20.4700, 85.8870, "Buxibazar Main Road, Cuttack",         "Cuttack"),
            ("Bin-CTC-03",  "ORGANIC",    20.4550, 85.8750, "Old Town Market, Cuttack",             "Cuttack"),
            ("Bin-PURI-01", "GENERAL",    19.8100, 85.8310, "Puri Sea Beach, Puri",                 "Puri"),
            ("Bin-PURI-02", "RECYCLABLE", 19.8050, 85.8200, "Puri Bus Stand, Puri",                 "Puri"),
            ("Bin-SAMB-01", "GENERAL",    21.4660, 83.9700, "Sambalpur Ainthapali, Sambalpur",      "Sambalpur"),
            ("Bin-SAMB-02", "ORGANIC",    21.4700, 83.9650, "Budharaja Area, Sambalpur",            "Sambalpur"),
            ("Bin-BHRM-01", "GENERAL",    19.3160, 84.7940, "Berhampur Bada Bazar",                 "Berhampur"),
            ("Bin-BHRM-02", "RECYCLABLE", 19.3200, 84.7980, "Berhampur Hospital Road",              "Berhampur"),
            ("Bin-JSGD-01", "GENERAL",    21.8550, 84.0050, "Jharsuguda Town Hall",                 "Jharsuguda"),
        ]

        for name, bin_type, lat, lng, address, city_name in BINS:
            city_obj = cities.get(city_name)
            if not city_obj:
                continue
            loc, _ = Location.objects.get_or_create(
                city=city_obj, address=address,
                defaults={"latitude": Decimal(str(lat)), "longitude": Decimal(str(lng))}
            )
            WasteBin.objects.get_or_create(
                name=name,
                defaults={"bin_type": bin_type, "location": loc, "capacity_liters": 200}
            )
        self.stdout.write(f"  [OK] {WasteBin.objects.count()} waste bins")

    # ================================================================
    # WATER SOURCES
    # ================================================================
    def _seed_water_sources(self, cities):
        from apps.water.models import WaterSource
        from apps.geography.models import Location

        SOURCES = [
            ("Mahanadi Reservoir Cuttack",     "RESERVOIR",       20.4200, 85.8500, "Mahanadi River, Cuttack",             "Cuttack",       50.0),
            ("Cuttack North Treatment Plant",  "TREATMENT_PLANT", 20.5000, 85.8600, "North Cuttack Industrial Area",       "Cuttack",       30.0),
            ("BBSR Chandaka Tank",             "TANK",            20.3600, 85.7800, "Chandaka Forest Area, Bhubaneswar",   "Bhubaneswar",   40.0),
            ("BBSR Daya River Pump Station",   "TREATMENT_PLANT", 20.2500, 85.7900, "Daya River, Bhubaneswar",            "Bhubaneswar",   60.0),
            ("Puri Temple Borewell",           "BOREWELL",        19.8050, 85.8350, "Near Jagannath Temple, Puri",         "Puri",           5.0),
            ("Sambalpur Hirakud Reservoir",    "RESERVOIR",       21.5200, 83.8700, "Hirakud Dam Area, Sambalpur",         "Sambalpur",     80.0),
            ("Berhampur Tank",                 "TANK",            19.3100, 84.8000, "Berhampur Municipality",              "Berhampur",     20.0),
            ("Rourkela Steel Plant Water",     "TREATMENT_PLANT", 22.2270, 84.8630, "Sector 1, Rourkela",                  "Sambalpur",     35.0),
        ]

        for name, source_type, lat, lng, address, city_name, capacity in SOURCES:
            city_obj = cities.get(city_name)
            if not city_obj:
                continue
            loc, _ = Location.objects.get_or_create(
                city=city_obj, address=address,
                defaults={"latitude": Decimal(str(lat)), "longitude": Decimal(str(lng))}
            )
            WaterSource.objects.get_or_create(
                name=name,
                defaults={"source_type": source_type, "location": loc, "capacity_million_liters": Decimal(str(capacity))}
            )
        self.stdout.write(f"  [OK] {WaterSource.objects.count()} water sources")

    # ================================================================
    # ELECTRICITY GRID ZONES
    # ================================================================
    def _seed_grid_zones(self, cities):
        from apps.electricity.models import GridZone
        from apps.geography.models import Zone

        GRIDS = [
            ("BBSR North Grid",    "BBSR-N01", "Bhubaneswar", 20.3500, 85.8100, 8000, 25000),
            ("BBSR South Grid",    "BBSR-S01", "Bhubaneswar", 20.2200, 85.8100, 6000, 18000),
            ("BBSR East Grid",     "BBSR-E01", "Bhubaneswar", 20.2961, 85.8600, 5000, 15000),
            ("CTC Central Grid",   "CTC-C01",  "Cuttack",     20.4625, 85.8830, 7000, 22000),
            ("CTC CDA Grid",       "CTC-D01",  "Cuttack",     20.4550, 85.8750, 5000, 14000),
            ("Puri Grid",          "PURI-01",  "Puri",        19.8100, 85.8310, 3000,  8000),
            ("Sambalpur Grid",     "SAMB-01",  "Sambalpur",   21.4660, 83.9700, 4000, 12000),
            ("Berhampur Grid",     "BHRM-01",  "Berhampur",   19.3160, 84.7940, 3500, 10000),
        ]

        for name, code, city_name, lat, lng, max_kw, consumers in GRIDS:
            city_obj = cities.get(city_name)
            geo_zone = Zone.objects.filter(city=city_obj).first() if city_obj else None
            GridZone.objects.get_or_create(
                code=code,
                defaults={
                    "name": name, "zone": geo_zone,
                    "max_load_kw": Decimal(str(max_kw)),
                    "total_consumers": consumers,
                }
            )
        self.stdout.write(f"  [OK] {GridZone.objects.count()} grid zones")

    # ================================================================
    # PUBLIC TRANSPORT — bus routes, stops, buses, locations
    # ================================================================
    def _seed_transport(self, cities):
        from apps.transport.models import BusRoute, BusStop, Bus, BusLocation
        from apps.geography.models import Location

        ROUTES = [
            # (route_num, name, origin, dest, dist, fare, city_name, stops)
            ("BBSR-01", "Bhubaneswar City Loop",
             "Master Canteen", "Bhubaneswar Railway Station", 15.5, 12.0, "Bhubaneswar",
             [
                 ("Master Canteen",       20.2675, 85.8412),
                 ("Raj Mahal Square",     20.2780, 85.8350),
                 ("Rasulgarh",            20.2900, 85.8250),
                 ("Vani Vihar",           20.3050, 85.8180),
                 ("NALCO Square",         20.3200, 85.8100),
                 ("Patia",               20.3519, 85.8195),
                 ("Khandagiri",          20.2580, 85.7700),
                 ("BBSR Railway Station", 20.2627, 85.8336),
             ]),
            ("BBSR-02", "Bhubaneswar to Airport",
             "Bhubaneswar Secretariat", "Bhubaneswar Airport", 8.0, 15.0, "Bhubaneswar",
             [
                 ("Secretariat",         20.2724, 85.8387),
                 ("Sachivalaya Marg",     20.2800, 85.8300),
                 ("Jaydev Vihar",        20.2960, 85.8180),
                 ("Bhubaneswar Airport", 20.2444, 85.8178),
             ]),
            ("BBSR-CTC", "Bhubaneswar to Cuttack Express",
             "Bhubaneswar Bus Stand", "Cuttack Bus Stand", 30.0, 25.0, "Bhubaneswar",
             [
                 ("BBSR Bus Stand",      20.2730, 85.8410),
                 ("Rasulgarh",           20.2900, 85.8250),
                 ("Pahala",              20.3700, 85.8300),
                 ("Khurda Road Junction",20.1700, 85.6200),
                 ("Choudwar",            20.4300, 85.9200),
                 ("Cuttack Bus Stand",   20.4625, 85.8830),
             ]),
            ("CTC-01", "Cuttack City Route",
             "Cuttack Bus Stand", "CDA Sector 9", 12.0, 10.0, "Cuttack",
             [
                 ("Cuttack Bus Stand",   20.4625, 85.8830),
                 ("Buxibazar",           20.4700, 85.8870),
                 ("Badambadi",           20.4800, 85.8950),
                 ("Telenga Bazar",       20.4550, 85.8700),
                 ("CDA Sector 1",        20.4400, 85.8600),
                 ("CDA Sector 6",        20.4350, 85.8550),
                 ("CDA Sector 9",        20.4250, 85.8480),
             ]),
            ("CTC-BBSR", "Cuttack to Bhubaneswar Fast",
             "Cuttack Station Road", "BBSR Old Town", 32.0, 25.0, "Cuttack",
             [
                 ("Cuttack Station Rd",  20.4625, 85.8800),
                 ("NH-55 Flyover",       20.4700, 85.9050),
                 ("Choudwar Bypass",     20.4300, 85.9200),
                 ("Mancheswar",          20.3100, 85.8400),
                 ("BBSR Old Town",       20.2947, 85.8312),
             ]),
            ("PURI-01", "Puri City Service",
             "Puri Bus Stand", "Puri Sea Beach", 5.0, 8.0, "Puri",
             [
                 ("Puri Bus Stand",      19.8050, 85.8200),
                 ("Grand Road",          19.8100, 85.8310),
                 ("Swargadwar",          19.7980, 85.8250),
                 ("Puri Sea Beach",      19.7950, 85.8300),
             ]),
            ("BBSR-PURI", "Bhubaneswar to Puri Express",
             "Bhubaneswar Bus Stand", "Puri Bus Stand", 60.0, 45.0, "Bhubaneswar",
             [
                 ("BBSR Bus Stand",      20.2730, 85.8410),
                 ("Bhubaneswar South",   20.2200, 85.8100),
                 ("Khurda Town",         20.1800, 85.6300),
                 ("Sakshipada",          19.9800, 85.7500),
                 ("Puri Bypass",         19.8200, 85.8100),
                 ("Puri Bus Stand",      19.8050, 85.8200),
             ]),
            ("SAMB-01", "Sambalpur City Loop",
             "Sambalpur Bus Stand", "Budharaja", 10.0, 10.0, "Sambalpur",
             [
                 ("Sambalpur Bus Stand", 21.4660, 83.9700),
                 ("College Road",        21.4700, 83.9750),
                 ("Ainthapali",          21.4750, 83.9650),
                 ("Khetrajpur",          21.4600, 83.9800),
                 ("Budharaja",           21.4550, 83.9600),
             ]),
            ("BHRM-01", "Berhampur City Service",
             "Berhampur Bus Stand", "Gandhi Nagar", 8.0, 8.0, "Berhampur",
             [
                 ("Berhampur Bus Stand", 19.3160, 84.7940),
                 ("Bada Bazar",          19.3200, 84.7980),
                 ("Town Hall",           19.3100, 84.7900),
                 ("Gandhi Nagar",        19.3050, 84.7850),
             ]),
            ("BAL-01", "Balasore City Route",
             "Balasore Station", "Sahadevkhunta", 6.0, 8.0, "Balasore",
             [
                 ("Balasore Station",    21.4940, 86.9320),
                 ("Hospital Road",       21.4970, 86.9360),
                 ("Town Center",         21.4950, 86.9300),
                 ("Sahadevkhunta",       21.5000, 86.9280),
             ]),
        ]

        DRIVER_NAMES = [
            "Arun Kumar Dash", "Bibhuti Bhushan", "Chandan Sahoo", "Debasis Nanda",
            "Girish Pattnaik", "Hemant Behera", "Jiban Mohanty", "Kiran Sahu",
            "Lalmohan Barik", "Manas Pradhan", "Naresh Swain", "Omkar Tripathy",
            "Prasanta Sethy", "Ranjit Mallick", "Santosh Mishra", "Tapan Nayak",
            "Umesh Parida", "Vikas Rao", "Wasim Khan", "Yogesh Kumar",
            "Akash Behera", "Bijay Panda", "Durga Sahoo", "Falguni Jena",
            "Ganesh Rout",
        ]

        routes = []
        bus_idx = 0
        for route_num, name, origin, dest, dist, fare, city_name, stops in ROUTES:
            city_obj = cities.get(city_name)
            route, _ = BusRoute.objects.get_or_create(
                route_number=route_num,
                defaults={
                    "name": name, "city": city_obj,
                    "origin": origin, "destination": dest,
                    "distance_km": Decimal(str(dist)),
                    "fare_inr": Decimal(str(fare)),
                }
            )
            routes.append(route)

            stop_objs = []
            for order, (stop_name, lat, lng) in enumerate(stops, start=1):
                if city_obj:
                    loc, _ = Location.objects.get_or_create(
                        city=city_obj, address=f"{stop_name} Bus Stop",
                        defaults={"latitude": Decimal(str(lat)), "longitude": Decimal(str(lng))}
                    )
                else:
                    loc = None
                stop, _ = BusStop.objects.get_or_create(
                    route=route, stop_order=order,
                    defaults={"name": stop_name, "location": loc}
                )
                stop_objs.append(stop)

            # Create 2-3 buses per route
            num_buses = 2 if route_num in ["PURI-01", "BAL-01", "BHRM-01"] else 3
            for b_idx in range(num_buses):
                reg = f"OD-{route_num}-{b_idx+1:02d}".replace("-", "")[:20]
                driver = DRIVER_NAMES[bus_idx % len(DRIVER_NAMES)]
                bus, created = Bus.objects.get_or_create(
                    registration_number=reg,
                    defaults={
                        "route": route,
                        "capacity": random.choice([42, 50, 55, 60]),
                        "driver_name": driver,
                        "driver_phone": f"98{random.randint(10000000, 99999999)}",
                    }
                )
                # Seed initial GPS location
                if created and stop_objs:
                    start_stop = stop_objs[b_idx % len(stop_objs)]
                    if start_stop.location:
                        BusLocation.objects.create(
                            bus=bus,
                            location_lat=start_stop.location.latitude + Decimal(str(random.uniform(-0.002, 0.002))),
                            location_lng=start_stop.location.longitude + Decimal(str(random.uniform(-0.002, 0.002))),
                            speed_kmh=Decimal(str(random.randint(15, 45))),
                            occupancy_percent=random.randint(20, 85),
                            next_stop=stop_objs[min(b_idx + 1, len(stop_objs) - 1)],
                            is_demo=True,
                            data_source="SIMULATOR",
                        )
                bus_idx += 1

        total_buses = Bus.objects.count()
        total_stops = BusStop.objects.count()
        self.stdout.write(f"  [OK] {len(routes)} routes, {total_buses} buses, {total_stops} stops")
        return routes

    # ================================================================
    # AQI STATIONS
    # ================================================================
    def _seed_aqi_stations(self, cities):
        from apps.pollution.models import AQIStation
        from apps.geography.models import Location

        STATIONS = [
            ("AQI-BBSR-01", "Bhubaneswar Rajmahal",      "Bhubaneswar", 20.2780, 85.8350),
            ("AQI-BBSR-02", "Bhubaneswar AIIMS",         "Bhubaneswar", 20.3519, 85.8195),
            ("AQI-BBSR-03", "Bhubaneswar Nayapalli",     "Bhubaneswar", 20.2800, 85.8000),
            ("AQI-CTC-01",  "Cuttack Buxibazar",         "Cuttack",     20.4700, 85.8870),
            ("AQI-CTC-02",  "Cuttack CDA Colony",        "Cuttack",     20.4550, 85.8750),
            ("AQI-PURI-01", "Puri Grand Road",           "Puri",        19.8100, 85.8390),
            ("AQI-SAMB-01", "Sambalpur Industrial Area", "Sambalpur",   21.4700, 83.9650),
            ("AQI-BHRM-01", "Berhampur Bus Stand Area",  "Berhampur",   19.3160, 84.7940),
        ]

        for code, name, city_name, lat, lng in STATIONS:
            city_obj = cities.get(city_name)
            if not city_obj:
                continue
            loc, _ = Location.objects.get_or_create(
                city=city_obj, address=name,
                defaults={"latitude": Decimal(str(lat)), "longitude": Decimal(str(lng))}
            )
            AQIStation.objects.get_or_create(name=name, defaults={"location": loc})

        self.stdout.write(f"  [OK] {AQIStation.objects.count()} AQI stations")

    # ================================================================
    # EMERGENCY CONTACTS
    # ================================================================
    def _seed_emergency_contacts(self):
        from apps.emergency.models import EmergencyContact

        contacts = [
            ("Police Control Room",           "100",           "POLICE"),
            ("Fire Brigade",                  "101",           "FIRE"),
            ("Ambulance (National)",          "102",           "AMBULANCE"),
            ("Disaster Management Helpline",  "108",           "DISASTER"),
            ("Odisha Helpline",               "14545",         "HELPLINE"),
            ("Women Helpline",                "1091",          "HELPLINE"),
            ("Child Helpline",                "1098",          "HELPLINE"),
        ]
        for name, phone, ctype in contacts:
            EmergencyContact.objects.get_or_create(
                phone=phone, defaults={"name": name, "type": ctype}
            )
        self.stdout.write(f"  [OK] {EmergencyContact.objects.count()} emergency contacts")

    # ================================================================
    # RESPONDERS
    # ================================================================
    def _seed_responders(self, cities):
        from apps.emergency.models import Responder

        bbsr = cities.get("Bhubaneswar")
        ctc  = cities.get("Cuttack")
        puri = cities.get("Puri")

        RESPONDERS = [
            ("POLICE-BBSR-01", "POLICE",    "AVAILABLE", bbsr),
            ("POLICE-BBSR-02", "POLICE",    "DISPATCHED", bbsr),
            ("POLICE-CTC-01",  "POLICE",    "AVAILABLE", ctc),
            ("FIRE-BBSR-01",   "FIRE",      "AVAILABLE", bbsr),
            ("FIRE-CTC-01",    "FIRE",      "ON_SCENE",  ctc),
            ("AMB-BBSR-01",    "AMBULANCE", "AVAILABLE", bbsr),
            ("AMB-BBSR-02",    "AMBULANCE", "RETURNING", bbsr),
            ("AMB-CTC-01",     "AMBULANCE", "AVAILABLE", ctc),
            ("RESCUE-BBSR-01", "RESCUE",    "AVAILABLE", bbsr),
            ("DISASTER-01",    "DISASTER",  "AVAILABLE", bbsr),
        ]
        for code, rtype, status, city_obj in RESPONDERS:
            Responder.objects.get_or_create(
                unit_code=code,
                defaults={"responder_type": rtype, "status": status, "city": city_obj}
            )
        self.stdout.write(f"  [OK] {Responder.objects.count()} responders")

    # ================================================================
    # FACILITIES
    # ================================================================
    def _seed_facilities(self, cities, districts):
        from apps.geography.models import Facility

        bbsr   = cities.get("Bhubaneswar")
        ctc    = cities.get("Cuttack")
        puri   = cities.get("Puri")
        samb   = cities.get("Sambalpur")
        bhrm   = cities.get("Berhampur")

        d_khordha = districts.get("Khordha")
        d_cuttack = districts.get("Cuttack")
        d_puri    = districts.get("Puri")
        d_samb    = districts.get("Sambalpur")
        d_ganjam  = districts.get("Ganjam")

        FACILITIES = [
            # hospitals
            ("AIIMS Bhubaneswar",           "HOSPITAL",      bbsr, d_khordha, "Sijua, Patrapada, Bhubaneswar", 20.3519, 85.8195, "0674-2476789"),
            ("SCB Medical College Cuttack",  "HOSPITAL",      ctc,  d_cuttack, "Manglabag, Cuttack",            20.4625, 85.8830, "0671-2300100"),
            ("Puri District Hospital",       "HOSPITAL",      puri, d_puri,   "Grand Road, Puri",               19.8100, 85.8310, "06752-223456"),
            ("Veer Surendra Sai Medical",    "HOSPITAL",      samb, d_samb,   "Burla, Sambalpur",               21.4800, 83.8700, "0663-2430000"),
            # police
            ("Commissionerate Police BBSR",  "POLICE",        bbsr, d_khordha, "Laxmisagar, Bhubaneswar",      20.2961, 85.8245, "0674-2401983"),
            ("Cuttack SP Office",            "POLICE",        ctc,  d_cuttack, "Buxi Bazar, Cuttack",          20.4700, 85.8870, "0671-2300555"),
            ("Puri SP Office",               "POLICE",        puri, d_puri,   "Near Bus Stand, Puri",           19.8050, 85.8200, "06752-223100"),
            # fire
            ("Bhubaneswar Fire Station",     "FIRE_STATION",  bbsr, d_khordha, "Lewis Road, Bhubaneswar",      20.2700, 85.8400, "0674-2401900"),
            ("Cuttack Fire Station",         "FIRE_STATION",  ctc,  d_cuttack, "Dolamundai, Cuttack",          20.4625, 85.8770, "0671-2300101"),
            # bus depots
            ("BBSR Central Bus Depot",       "BUS_DEPOT",     bbsr, d_khordha, "Baramunda, Bhubaneswar",       20.2730, 85.8000, "0674-2535000"),
            ("Cuttack Bus Depot",            "BUS_DEPOT",     ctc,  d_cuttack, "Badambadi, Cuttack",           20.4800, 85.8950, "0671-2300200"),
        ]

        for name, ftype, city_obj, dist_obj, address, lat, lng, phone in FACILITIES:
            if not city_obj or not dist_obj:
                continue
            Facility.objects.get_or_create(
                name=name, city=city_obj,
                defaults={
                    "facility_type": ftype, "district": dist_obj,
                    "address": address, "latitude": Decimal(str(lat)), "longitude": Decimal(str(lng)),
                    "phone": phone, "is_demo": True,
                }
            )
        self.stdout.write(f"  [OK] {Facility.objects.count()} facilities")

    # ================================================================
    # EMERGENCY INCIDENTS
    # ================================================================
    def _seed_emergency_incidents(self, cities):
        from apps.emergency.models import EmergencyIncident
        from apps.geography.models import Location

        bbsr = cities.get("Bhubaneswar")
        ctc  = cities.get("Cuttack")
        puri = cities.get("Puri")

        def loc(city_obj, address, lat, lng):
            l, _ = Location.objects.get_or_create(
                city=city_obj, address=address,
                defaults={"latitude": Decimal(str(lat)), "longitude": Decimal(str(lng))}
            )
            return l

        INCIDENTS = [
            ("FIRE",    "CRITICAL", "Factory fire at Mancheswar",
             "A garment factory near Mancheswar Industrial Area caught fire. Fire brigade dispatched.",
             "RESPONDING", bbsr, "Mancheswar Industrial Area", 20.3100, 85.8400),
            ("MEDICAL", "HIGH",    "Road accident near AIIMS",
             "Two-vehicle collision. Multiple injuries reported. Ambulance en route.",
             "RESPONDING", bbsr, "AIIMS Roundabout, BBSR", 20.3519, 85.8195),
            ("FLOOD",   "HIGH",    "Waterlogging at Cuttack Badambadi",
             "Heavy overnight rainfall caused waterlogging at Badambadi Chowk. Traffic disrupted.",
             "ACKNOWLEDGED", ctc, "Badambadi Chowk, Cuttack", 20.4800, 85.8950),
            ("ACCIDENT","MEDIUM",  "Truck breakdown on NH-16",
             "A heavy goods vehicle broke down on NH-16 near Bhubaneswar, causing traffic slowdown.",
             "CONTAINED", bbsr, "NH-16 Bypass, BBSR", 20.3000, 85.8100),
            ("MEDICAL", "MEDIUM",  "Medical emergency at Puri Beach",
             "Swimmer rescued from strong currents near Puri Sea Beach.",
             "RESOLVED", puri, "Puri Sea Beach", 19.7950, 85.8300),
            ("FIRE",    "MEDIUM",  "Electrical fire at Cuttack Market",
             "Short circuit caused a small fire at Buxibazar market. Contained by local fire team.",
             "RESOLVED", ctc, "Buxibazar, Cuttack", 20.4700, 85.8870),
            ("OTHER",   "LOW",     "Stray cattle on NH-55",
             "Cattle herd blocking traffic near Choudwar on NH-55. Police notified.",
             "REPORTED", ctc, "NH-55 near Choudwar", 20.4300, 85.9200),
        ]

        for itype, severity, title, desc, status, city_obj, address, lat, lng in INCIDENTS:
            if EmergencyIncident.objects.filter(title=title).exists():
                continue
            location = loc(city_obj, address, lat, lng) if city_obj else None
            EmergencyIncident.objects.create(
                incident_type=itype, severity=severity,
                title=title, description=desc, status=status, location=location,
                is_demo=True, data_source="SIMULATOR"
            )
        self.stdout.write(f"  [OK] {EmergencyIncident.objects.count()} emergency incidents")

    # ================================================================
    # EMERGENCY ALERTS
    # ================================================================
    def _seed_emergency_alerts(self, cities):
        from apps.emergency.models import EmergencyAlert
        from apps.accounts.models import CustomUser

        admin = CustomUser.objects.filter(email="admin@cityos.gov").first()
        bbsr  = cities.get("Bhubaneswar")
        puri  = cities.get("Puri")

        ALERTS = [
            ("Yellow Alert — Heavy Rainfall Expected",
             "IMD has issued a yellow alert for Khordha and Cuttack districts. Moderate to heavy rainfall expected over the next 24 hours. Citizens advised to avoid low-lying areas.",
             "WARNING", "ACTIVE", None),
            ("Puri Sea — High Tide Advisory",
             "High tide conditions expected at Puri Sea Beach between 6 PM and 10 PM. Citizens advised not to venture into the sea.",
             "WARNING", "ACTIVE", puri),
            ("NH-16 Maintenance Closure — Night Only",
             "NH-16 between Bhubaneswar and Khurda will be closed for road widening maintenance between 11 PM and 5 AM for the next 5 nights.",
             "INFO", "PUBLISHED", bbsr),
        ]

        for title, desc, severity, status, city_obj in ALERTS:
            if EmergencyAlert.objects.filter(title=title).exists():
                continue
            EmergencyAlert.objects.create(
                title=title, description=desc, severity=severity,
                status=status, city=city_obj, created_by=admin,
            )
        self.stdout.write(f"  [OK] {EmergencyAlert.objects.count()} emergency alerts")

    # ================================================================
    # COMPLAINTS — 50 realistic demo complaints
    # ================================================================
    def _seed_complaints(self, cities):
        from apps.accounts.models import CustomUser, Department, Role
        from apps.complaints.models import Complaint, ComplaintAssignment, ComplaintHistory, SLAConfiguration
        from apps.geography.models import Ward

        if Complaint.objects.count() >= 30:
            self.stdout.write(f"  [OK] Complaints already seeded ({Complaint.objects.count()})")
            return

        bbsr = cities.get("Bhubaneswar")
        ctc  = cities.get("Cuttack")
        puri = cities.get("Puri")
        samb = cities.get("Sambalpur")
        bhrm = cities.get("Berhampur")

        citizens = list(CustomUser.objects.filter(role__name=Role.CITIZEN))
        workers  = list(CustomUser.objects.filter(role__name=Role.FIELD_WORKER))
        officer  = CustomUser.objects.filter(email="officer@cityos.gov").first()
        officer_traffic = CustomUser.objects.filter(email="traffic.officer@cityos.gov").first()
        officer_waste   = CustomUser.objects.filter(email="waste.officer@cityos.gov").first()

        depts = {code: Department.objects.filter(code=code).first() for code in [
            Department.CITIZEN_SERVICES, Department.TRAFFIC, Department.WASTE,
            Department.WATER, Department.ELECTRICITY, Department.TRANSPORT,
            Department.EMERGENCY, Department.POLLUTION,
        ]}
        sla_med = SLAConfiguration.objects.filter(priority="MEDIUM").first()
        sla_high = SLAConfiguration.objects.filter(priority="HIGH").first()
        sla_crit = SLAConfiguration.objects.filter(priority="CRITICAL").first()

        now = timezone.now()

        COMPLAINTS_DATA = [
            # (cat, title, desc, priority, status, city, lat, lng, dept_code, days_ago)
            ("ROAD",         "Deep Pothole on Nayapalli Road",
             "A very deep pothole has formed near the Nayapalli petrol pump. Two bikes have already damaged.",
             "HIGH",    "IN_PROGRESS", bbsr, 20.2800, 85.8000, Department.CITIZEN_SERVICES, 5),
            ("GARBAGE",      "Garbage pile outside Cuttack Market",
             "Overflowing garbage bins at Buxibazar market. Foul smell and flies.",
             "MEDIUM",  "ASSIGNED",    ctc,  20.4700, 85.8870, Department.WASTE, 3),
            ("WATER_LEAKAGE","Water pipe burst at CDA Sector 4",
             "Underground water pipe has burst at CDA Sector 4. Water flowing on road since yesterday.",
             "CRITICAL", "ON_SITE",    ctc,  20.4400, 85.8600, Department.WATER, 1),
            ("STREET_LIGHT", "3 Street lights not working on Patia Road",
             "The street lights near Patia Square have been non-functional for a week. Area is very dark at night.",
             "MEDIUM",  "PENDING",     bbsr, 20.3519, 85.8195, Department.ELECTRICITY, 2),
            ("TRAFFIC_SIGNAL","Traffic signal broken at Rasulgarh",
             "The signal at Rasulgarh junction is stuck on red for one direction causing huge backlog.",
             "HIGH",    "ASSIGNED",    bbsr, 20.2900, 85.8250, Department.TRAFFIC, 4),
            ("DRAINAGE",     "Blocked drain causing flooding near BBSR Old Town",
             "Drain has been blocked for two weeks. Even light rain causes street flooding.",
             "HIGH",    "REVIEW",      bbsr, 20.2947, 85.8312, Department.CITIZEN_SERVICES, 7),
            ("ROAD",         "Road broken after recent rain — Puri Grand Road",
             "Large chunk of road surface has collapsed near Puri hospital. Very dangerous.",
             "HIGH",    "PENDING",     puri, 19.8100, 85.8310, Department.CITIZEN_SERVICES, 1),
            ("GARBAGE",      "Construction waste dumped illegally on NH-16",
             "Builder has dumped debris on NH-16 service lane. Road is half blocked.",
             "MEDIUM",  "RESOLVED",    bbsr, 20.3000, 85.8100, Department.WASTE, 10),
            ("ELECTRICITY",  "Power outage at Sambalpur Ainthapali for 8+ hours",
             "Entire Ainthapali area has had no power since last night. GEDCOL helpline not responding.",
             "CRITICAL", "ASSIGNED",   samb, 21.4750, 83.9650, Department.ELECTRICITY, 1),
            ("WATER_SUPPLY", "No water supply in Nayapalli for 3 days",
             "Our area hasn't received municipal water supply for 3 consecutive days.",
             "HIGH",    "IN_PROGRESS", bbsr, 20.2800, 85.8000, Department.WATER, 3),
            ("POLLUTION",    "Black smoke from factory near Mancheswar",
             "Factory near Mancheswar is releasing heavy black smoke continuously causing breathing problems.",
             "HIGH",    "PENDING",     bbsr, 20.3100, 85.8400, Department.POLLUTION, 2),
            ("ROAD_BLOCKAGE","Truck stuck under Cuttack flyover",
             "Overloaded truck with height exceeding limit got stuck under Cuttack-Bhubaneswar flyover.",
             "CRITICAL", "RESOLVED",   ctc,  20.4700, 85.9050, Department.TRAFFIC, 5),
            ("STRAY_ANIMAL", "Pack of dogs attacking near BBSR railway station",
             "Aggressive stray dog pack near BBSR railway station exit gate. 2 people bitten yesterday.",
             "HIGH",    "PENDING",     bbsr, 20.2627, 85.8336, Department.CITIZEN_SERVICES, 1),
            ("PUBLIC_TOILET","Public toilet near Puri beach non-functional",
             "The public toilet facility near beach parking has no water. Unhygienic condition.",
             "MEDIUM",  "PENDING",     puri, 19.7950, 85.8300, Department.WASTE, 2),
            ("FLOODING",     "Cyclone damage — roads flooded at Berhampur",
             "Several roads in Berhampur flooded after cyclonic storm. Trees fallen on roads too.",
             "CRITICAL", "IN_PROGRESS",bhrm, 19.3160, 84.7940, Department.EMERGENCY, 2),
            ("STREET_LIGHT", "Street lights dead for 2 km stretch — Sambalpur College Road",
             "Complete darkness on 2km of College Road in Sambalpur after main fuse blown.",
             "HIGH",    "ASSIGNED",    samb, 21.4700, 83.9750, Department.ELECTRICITY, 3),
            ("WATER_LEAKAGE","Sewage mixing with drinking water at CDA",
             "Residents report sewage smell in tap water in CDA Sector 6. Health risk.",
             "CRITICAL", "IN_PROGRESS",ctc,  20.4350, 85.8550, Department.WATER, 2),
            ("GARBAGE",      "Garbage not collected for 5 days — Puri",
             "Garbage collection has not happened in our ward for 5 consecutive days.",
             "MEDIUM",  "RESOLVED",    puri, 19.8050, 85.8200, Department.WASTE, 6),
            ("ELECTRICITY",  "Power cable hanging loose over road",
             "A high-tension wire is hanging dangerously low over Nayapalli road after last night's storm.",
             "CRITICAL", "ASSIGNED",   bbsr, 20.2800, 85.8000, Department.ELECTRICITY, 1),
            ("ROAD",         "Missing manhole cover near Vani Vihar",
             "Manhole cover missing near Vani Vihar crossroads. Very dangerous especially at night.",
             "HIGH",    "ON_SITE",     bbsr, 20.3050, 85.8180, Department.CITIZEN_SERVICES, 3),
            ("TRAFFIC_SIGNAL","No traffic signal at Cuttack Dolamundai",
             "Traffic signal at Dolamundai junction is permanently off. Police needed.",
             "MEDIUM",  "PENDING",     ctc,  20.4625, 85.8770, Department.TRAFFIC, 4),
            ("DRAINAGE",     "Open drain causing health hazard — Berhampur",
             "Open drain near Bada Bazar, Berhampur running with stagnant water. Mosquito breeding.",
             "HIGH",    "PENDING",     bhrm, 19.3200, 84.7980, Department.CITIZEN_SERVICES, 2),
            ("TRANSPORT",    "Bus route BBSR-01 — buses not arriving on schedule",
             "Bus route BBSR-01 buses have been 30-45 minutes late every day this week.",
             "MEDIUM",  "PENDING",     bbsr, 20.2675, 85.8412, Department.TRANSPORT, 3),
            ("WATER_SUPPLY", "Low water pressure in Badambadi, Cuttack",
             "Water pressure has been very low in Badambadi area. Only slight trickle from taps.",
             "MEDIUM",  "REVIEW",      ctc,  20.4800, 85.8950, Department.WATER, 5),
            ("ROAD",         "Road repair incomplete — left open with no barricade",
             "Contractors repaired part of road then left with open trench and no warning signs.",
             "HIGH",    "CLOSED",      bbsr, 20.2961, 85.8245, Department.CITIZEN_SERVICES, 12),
        ]

        created = 0
        for (cat, title, desc, priority, status, city_obj,
             lat, lng, dept_code, days_ago) in COMPLAINTS_DATA:

            if not city_obj:
                continue
            citizen = random.choice(citizens) if citizens else None
            if not citizen:
                continue

            dept = depts.get(dept_code)
            ward = Ward.objects.filter(city=city_obj).first()
            sla  = sla_high if priority == "HIGH" else (sla_crit if priority == "CRITICAL" else sla_med)
            created_ts = now - timedelta(days=days_ago, hours=random.randint(0, 8))
            sla_due = created_ts + timedelta(minutes=sla.resolution_minutes) if sla else None

            c = Complaint(
                citizen=citizen, category=cat, title=title, description=desc,
                priority=priority, status=status, department=dept, ward=ward,
                location_lat=Decimal(str(lat)), location_lng=Decimal(str(lng)),
                address=f"Demo location — {city_obj.name}",
                sla_config=sla, sla_due_at=sla_due,
                sla_breached=(status in ["PENDING", "ASSIGNED"] and sla_due and sla_due < now),
            )
            c.save()
            c.created_at = created_ts
            Complaint.objects.filter(pk=c.pk).update(created_at=created_ts)

            ComplaintHistory.objects.create(
                complaint=c, event_type="STATUS_CHANGE",
                old_value="", new_value="PENDING",
                remarks="Complaint submitted by citizen.", changed_by=citizen,
            )

            if status not in ["PENDING"]:
                assigner = officer if dept_code == Department.CITIZEN_SERVICES else (
                    officer_traffic if dept_code == Department.TRAFFIC else
                    officer_waste if dept_code == Department.WASTE else officer
                )
                worker = random.choice(workers) if workers else None
                if worker and assigner:
                    ComplaintAssignment.objects.create(
                        complaint=c, assigned_to=worker, assigned_by=assigner,
                        remarks="Assigned for field inspection."
                    )
                    ComplaintHistory.objects.create(
                        complaint=c, event_type="ASSIGNMENT",
                        old_value="", new_value=worker.username,
                        remarks=f"Assigned to {worker.full_name or worker.username}",
                        changed_by=assigner,
                    )

            created += 1

        self.stdout.write(f"  [OK] {Complaint.objects.count()} complaints seeded")

    # ================================================================
    # ANNOUNCEMENTS
    # ================================================================
    def _seed_announcements(self, cities):
        from apps.notifications.models import Announcement
        from apps.accounts.models import CustomUser

        if Announcement.objects.exists():
            self.stdout.write(f"  [OK] Announcements already seeded")
            return

        admin = CustomUser.objects.filter(email="admin@cityos.gov").first()
        now = timezone.now()

        ANNOUNCEMENTS = [
            ("Road Widening — NH-16 Bhubaneswar",
             "Road widening work on NH-16 between BBSR and Khurda will begin from next Monday. Minor traffic diversions expected. Citizens are requested to cooperate.",
             "TRAFFIC"),
            ("Water Supply Disruption — CDA Cuttack",
             "Due to maintenance of the main water pipeline, water supply will be suspended in CDA Sector 1–6 from 8 AM to 4 PM on Saturday.",
             "WATER"),
            ("Planned Power Shutdown — Nayapalli BBSR",
             "Electricity supply in Nayapalli area will be shut down for 3 hours (10 AM–1 PM) on Sunday for TPCODL substation maintenance.",
             "ELECTRICITY"),
            ("Bus Route Launched — BBSR to Cuttack Express",
             "A new express bus service BBSR-CTC has been launched with reduced journey time of 40 minutes. Buses depart every 20 minutes from BBSR Bus Stand.",
             "TRANSPORT"),
            ("Odisha Cleanliness Drive — Join Us!",
             "Bhubaneswar Smart City is organising a city-wide cleanliness drive this Sunday. Citizens are invited to join at your nearest ward. Refreshments will be provided.",
             "CIVIC"),
        ]

        for title, msg, category in ANNOUNCEMENTS:
            Announcement.objects.create(
                title=title, message=msg, category=category,
                created_by=admin, scope_level="STATE",
                expires_at=now + timedelta(days=30),
            )
        self.stdout.write(f"  [OK] {Announcement.objects.count()} announcements")

    # ================================================================
    # IoT SENSOR READINGS — so charts have data on first load
    # ================================================================
    def _seed_iot_readings(self):
        from apps.traffic.models import TrafficZone, TrafficReading
        from apps.waste.models import WasteBin, WasteBinReading
        from apps.water.models import WaterSource, WaterReading
        from apps.electricity.models import GridZone, ElectricityReading
        from apps.pollution.models import AQIStation, AQIReading

        now = timezone.now()

        # Traffic readings — 24 hours of data, 1 per hour per zone
        zones = list(TrafficZone.objects.filter(is_active=True))
        traffic_readings = []
        for zone in zones:
            for h in range(24):
                ts = now - timedelta(hours=24 - h)
                density = random.randint(10, 85)
                if density <= 25:
                    cong, speed = "FREE",     Decimal(str(random.uniform(70, 90)))
                elif density <= 50:
                    cong, speed = "MODERATE", Decimal(str(random.uniform(45, 70)))
                elif density <= 75:
                    cong, speed = "HEAVY",    Decimal(str(random.uniform(20, 45)))
                else:
                    cong, speed = "JAMMED",   Decimal(str(random.uniform(5, 20)))
                traffic_readings.append(TrafficReading(
                    zone=zone, density=density, avg_speed_kmh=speed,
                    congestion_level=cong, incident_flag=False,
                    is_demo=True, data_source="SIMULATOR",
                ))
        TrafficReading.objects.bulk_create(traffic_readings, ignore_conflicts=True)

        # Waste bin readings — 5 per bin
        bins = list(WasteBin.objects.filter(is_active=True))
        bin_readings = []
        for b in bins:
            for i in range(5):
                fill = random.randint(20, 95)
                bin_readings.append(WasteBinReading(
                    bin=b, fill_percent=fill, battery_percent=random.randint(60, 100),
                    alert_triggered=(fill >= 80),
                    is_demo=True, data_source="SIMULATOR",
                ))
        WasteBinReading.objects.bulk_create(bin_readings, ignore_conflicts=True)

        # Water readings — 12 per source
        sources = list(WaterSource.objects.filter(is_active=True))
        water_readings = []
        for s in sources:
            for i in range(12):
                level = Decimal(str(random.uniform(35, 95)))
                water_readings.append(WaterReading(
                    source=s, level_percent=level,
                    ph=Decimal(str(round(random.uniform(6.5, 8.5), 2))),
                    turbidity_ntu=Decimal(str(round(random.uniform(0.5, 4.0), 2))),
                    flow_rate_lps=Decimal(str(round(random.uniform(2.0, 8.0), 3))),
                    is_demo=True, data_source="SIMULATOR",
                ))
        WaterReading.objects.bulk_create(water_readings, ignore_conflicts=True)

        # Electricity readings — 12 per grid zone
        grids = list(GridZone.objects.filter(is_active=True))
        elec_readings = []
        for g in grids:
            for i in range(12):
                load_pct = Decimal(str(round(random.uniform(30, 92), 2)))
                load_kw = (load_pct / 100) * g.max_load_kw
                elec_readings.append(ElectricityReading(
                    zone=g,
                    voltage_v=Decimal(str(round(random.uniform(218, 242), 2))),
                    current_a=Decimal(str(round(random.uniform(50, 400), 2))),
                    load_kw=load_kw, load_percent=load_pct,
                    frequency_hz=Decimal("50.00"),
                    overload_flag=(load_pct > 90),
                    is_demo=True, data_source="SIMULATOR",
                ))
        ElectricityReading.objects.bulk_create(elec_readings, ignore_conflicts=True)

        # AQI readings — 24 per station
        stations = list(AQIStation.objects.filter(is_active=True))
        aqi_readings = []
        for st in stations:
            for h in range(24):
                aqi_val = Decimal(str(round(random.uniform(28, 180), 2)))
                pm25 = aqi_val * Decimal("0.4")
                pm10 = aqi_val * Decimal("0.6")
                if aqi_val <= 50:
                    cat = "GOOD"
                elif aqi_val <= 100:
                    cat = "MODERATE"
                elif aqi_val <= 150:
                    cat = "UNHEALTHY"
                else:
                    cat = "VERY_UNHEALTHY"
                aqi_readings.append(AQIReading(
                    station=st, pm25=pm25, pm10=pm10,
                    no2=Decimal(str(round(random.uniform(5, 40), 2))),
                    so2=Decimal(str(round(random.uniform(2, 20), 2))),
                    aqi_value=aqi_val, category=cat,
                    is_demo=True, data_source="SIMULATOR",
                ))
        AQIReading.objects.bulk_create(aqi_readings, ignore_conflicts=True)

        self.stdout.write(f"  [OK] IoT readings seeded (traffic/waste/water/electricity/AQI)")

    def _seed_water_schedules_notices(self, cities):
        from apps.water.models import WaterSchedule, WaterNotice
        from django.utils import timezone
        from datetime import time, timedelta
        import random
        
        now = timezone.now()
        
        created_scheds = 0
        created_notices = 0
        
        # 1. Schedules
        for city in cities.values():
            for ward in city.wards.all():
                if random.random() > 0.3:
                    WaterSchedule.objects.get_or_create(
                        city=city, ward=ward,
                        defaults={
                            "morning_start": time(6, 0),
                            "morning_end": time(8, 0),
                            "evening_start": time(17, 0),
                            "evening_end": time(19, 0),
                            "days_of_supply": "Everyday"
                        }
                    )
                    created_scheds += 1
                    
                # 2. Notices
                # Active notice
                if random.random() > 0.8:
                    WaterNotice.objects.get_or_create(
                        city=city, ward=ward, status="IN_PROGRESS",
                        defaults={
                            "notice_type": random.choice(["PLANNED_CUT", "EMERGENCY_CUT", "MAINTENANCE"]),
                            "title": f"Water Supply Interruption in {ward.name or 'Ward '+str(ward.number)}",
                            "description": "Please store sufficient water.",
                            "reason": random.choice(["Pipeline repair", "Pump failure", "Tank maintenance"]),
                            "start_time": now - timedelta(hours=2),
                            "expected_restoration": now + timedelta(hours=4),
                        }
                    )
                    created_notices += 1
                
                # Upcoming notice
                if random.random() > 0.9:
                    WaterNotice.objects.get_or_create(
                        city=city, ward=ward, status="UPCOMING",
                        defaults={
                            "notice_type": "PLANNED_CUT",
                            "title": f"Planned Pipeline Repair in {ward.name or 'Ward '+str(ward.number)}",
                            "description": "Routine maintenance scheduled.",
                            "reason": "Pipeline repair",
                            "start_time": now + timedelta(days=2, hours=4),
                            "expected_restoration": now + timedelta(days=2, hours=8),
                        }
                    )
                    created_notices += 1
                    
                # Resolved notice
                if random.random() > 0.7:
                    WaterNotice.objects.get_or_create(
                        city=city, ward=ward, status="RESOLVED",
                        defaults={
                            "notice_type": "EMERGENCY_CUT",
                            "title": f"Emergency Leakage in {ward.name or 'Ward '+str(ward.number)}",
                            "description": "A leakage was detected and fixed.",
                            "reason": "Emergency leakage",
                            "start_time": now - timedelta(days=5, hours=4),
                            "expected_restoration": now - timedelta(days=5, hours=1),
                            "actual_restoration": now - timedelta(days=5, hours=1),
                        }
                    )
                    created_notices += 1

        self.stdout.write(f"  [OK] {created_scheds} water schedules, {created_notices} water notices seeded")
