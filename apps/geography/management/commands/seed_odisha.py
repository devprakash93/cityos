"""
Management command: seed_odisha
================================
Creates the complete Odisha geographic hierarchy seed data.

IDEMPOTENT: Uses get_or_create throughout.
Safe to run multiple times — will not create duplicate records.

Usage:
    python manage.py seed_odisha
    python manage.py seed_odisha --reset  (clears and re-seeds)

Data included:
- 1 State: Odisha
- 30 Districts (all official Odisha districts)
- 8 Demo Cities: Cuttack (default), Bhubaneswar, Puri, Rourkela,
                  Sambalpur, Berhampur, Balasore, Angul
- Zones + Wards for Cuttack (primary demo city)
- Demo Facilities (is_demo=True, DEMO-ONLY phone numbers)

NOTE: All data is for academic demonstration.
Phone numbers are labeled DEMO-ONLY and should never be called.
"""
from django.core.management.base import BaseCommand
from apps.geography.models import State, District, City, Zone, Ward, Location, Facility


ODISHA_DISTRICTS = [
    ("Angul", 20.8400, 85.1000),
    ("Balangir", 20.7000, 83.4800),
    ("Balasore", 21.4900, 86.9300),
    ("Bargarh", 21.3300, 83.6200),
    ("Bhadrak", 21.0500, 86.5200),
    ("Boudh", 20.8400, 84.3200),
    ("Cuttack", 20.4625, 85.8830),
    ("Deogarh", 21.5400, 84.7300),
    ("Dhenkanal", 20.6500, 85.5900),
    ("Gajapati", 18.9400, 84.0900),
    ("Ganjam", 19.3800, 84.6400),
    ("Jagatsinghpur", 20.2600, 86.1700),
    ("Jajpur", 20.8400, 86.3400),
    ("Jharsuguda", 21.8500, 84.0100),
    ("Kalahandi", 19.9100, 83.1600),
    ("Kandhamal", 20.1200, 84.2300),
    ("Kendrapara", 20.5000, 86.4200),
    ("Kendujhar", 21.6400, 85.5800),
    ("Khordha", 20.1800, 85.6100),
    ("Koraput", 18.8100, 82.7100),
    ("Malkangiri", 18.3400, 81.8800),
    ("Mayurbhanj", 22.0700, 86.1700),
    ("Nabarangpur", 19.2300, 82.5400),
    ("Nayagarh", 20.1200, 85.0900),
    ("Nuapada", 20.7800, 82.5400),
    ("Puri", 19.8100, 85.8200),
    ("Rayagada", 19.1700, 83.4100),
    ("Sambalpur", 21.4700, 83.9700),
    ("Sonepur", 20.8300, 83.9200),
    ("Sundargarh", 22.1000, 84.0400),
]

DEMO_CITIES = [
    {
        "name": "Cuttack",
        "district": "Cuttack",
        "lat": 20.4625,
        "lng": 85.8830,
        "population": 675000,
        "is_default": True,
    },
    {
        "name": "Bhubaneswar",
        "district": "Khordha",
        "lat": 20.2961,
        "lng": 85.8245,
        "population": 1000000,
        "is_default": False,
    },
    {
        "name": "Puri",
        "district": "Puri",
        "lat": 19.8135,
        "lng": 85.8312,
        "population": 200000,
        "is_default": False,
    },
    {
        "name": "Rourkela",
        "district": "Sundargarh",
        "lat": 22.2604,
        "lng": 84.8536,
        "population": 550000,
        "is_default": False,
    },
    {
        "name": "Sambalpur",
        "district": "Sambalpur",
        "lat": 21.4669,
        "lng": 83.9812,
        "population": 350000,
        "is_default": False,
    },
    {
        "name": "Berhampur",
        "district": "Ganjam",
        "lat": 19.3149,
        "lng": 84.7941,
        "population": 420000,
        "is_default": False,
    },
    {
        "name": "Balasore",
        "district": "Balasore",
        "lat": 21.4942,
        "lng": 86.9338,
        "population": 200000,
        "is_default": False,
    },
    {
        "name": "Angul",
        "district": "Angul",
        "lat": 20.8400,
        "lng": 85.1000,
        "population": 150000,
        "is_default": False,
    },
]

DEMO_CITY_ZONES = {
    "Bhubaneswar": 4,
    "Puri": 3,
    "Rourkela": 3,
    "Sambalpur": 3,
    "Berhampur": 3,
    "Balasore": 2,
    "Angul": 2,
}

CUTTACK_ZONES = [
    "Badambadi",
    "CDA (Cuttack Development Authority)",
    "Old Town",
    "Link Road",
    "Mangalabag",
    "Jagatpur",
    "Choudwar",
    "Chandinichowk",
]

CUTTACK_WARDS = [
    (1, "College Square", "Badambadi"),
    (2, "Buxi Bazaar", "Old Town"),
    (3, "Badambadi Main", "Badambadi"),
    (4, "CDA Sector 1", "CDA (Cuttack Development Authority)"),
    (5, "CDA Sector 6", "CDA (Cuttack Development Authority)"),
    (6, "Link Road North", "Link Road"),
    (7, "Mangalabag East", "Mangalabag"),
    (8, "Jagatpur Industrial", "Jagatpur"),
    (9, "Choudwar Central", "Choudwar"),
    (10, "Chandinichowk Market", "Chandinichowk"),
]

CUTTACK_FACILITIES = [
    {
        "name": "SCB Medical College & Hospital",
        "type": Facility.TYPE_HOSPITAL,
        "address": "Mangalabag, Cuttack, Odisha",
        "lat": 20.4700, "lng": 85.8780,
        "phone": "DEMO-ONLY",
        "notes": "Demo facility — SCB is a real hospital but data here is for demonstration only",
    },
    {
        "name": "Cuttack Sadar Hospital",
        "type": Facility.TYPE_HOSPITAL,
        "address": "Buxi Bazaar, Cuttack, Odisha",
        "lat": 20.4617, "lng": 85.8810,
        "phone": "DEMO-ONLY",
        "notes": "Demo facility",
    },
    {
        "name": "Cuttack Police HQ (Commissioner Office)",
        "type": Facility.TYPE_POLICE,
        "address": "Link Road, Cuttack, Odisha",
        "lat": 20.4640, "lng": 85.8855,
        "phone": "100 (National Emergency)",
        "notes": "Use national number 100 for emergencies",
    },
    {
        "name": "Badambadi Police Station",
        "type": Facility.TYPE_POLICE,
        "address": "Badambadi, Cuttack, Odisha",
        "lat": 20.4590, "lng": 85.8770,
        "phone": "DEMO-ONLY",
        "notes": "Demo facility",
    },
    {
        "name": "Cuttack Fire Station",
        "type": Facility.TYPE_FIRE,
        "address": "Mangalabag Road, Cuttack, Odisha",
        "lat": 20.4680, "lng": 85.8900,
        "phone": "101 (National Fire Emergency)",
        "notes": "Use national number 101 for fire emergencies",
    },
    {
        "name": "ODRAF Disaster Response Station — Cuttack",
        "type": Facility.TYPE_DISASTER,
        "address": "Jagatpur, Cuttack, Odisha",
        "lat": 20.5000, "lng": 85.9100,
        "phone": "DEMO-ONLY",
        "notes": "ODRAF (Odisha Disaster Rapid Action Force) — demo entry only",
    },
]

BHUBANESWAR_FACILITIES = [
    {
        "name": "AIIMS Bhubaneswar",
        "type": Facility.TYPE_HOSPITAL,
        "address": "Sijua, Patia, Bhubaneswar, Odisha",
        "lat": 20.2667, "lng": 85.8042,
        "phone": "DEMO-ONLY",
        "notes": "Demo facility",
    },
    {
        "name": "Capital Hospital Bhubaneswar",
        "type": Facility.TYPE_HOSPITAL,
        "address": "Unit 6, Bhubaneswar, Odisha",
        "lat": 20.2700, "lng": 85.8400,
        "phone": "DEMO-ONLY",
        "notes": "Demo facility",
    },
    {
        "name": "Bhubaneswar Police Commissionerate",
        "type": Facility.TYPE_POLICE,
        "address": "Saheed Nagar, Bhubaneswar, Odisha",
        "lat": 20.2800, "lng": 85.8400,
        "phone": "100 (National Emergency)",
        "notes": "Use national number 100 for emergencies",
    },
    {
        "name": "Bhubaneswar Fire Station",
        "type": Facility.TYPE_FIRE,
        "address": "Rasulgarh, Bhubaneswar, Odisha",
        "lat": 20.2900, "lng": 85.8100,
        "phone": "101 (National Fire Emergency)",
        "notes": "Use national number 101 for fire emergencies",
    },
]


class Command(BaseCommand):
    help = "Seed Odisha geographic hierarchy data (idempotent — safe to run multiple times)"

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset-demo',
            action='store_true',
            help='Clear existing data and re-seed (WARNING: destructive)',
        )

    def handle(self, *args, **options):
        if options['reset_demo']:
            self.stdout.write(self.style.WARNING("⚠️  Resetting geography data..."))
            Facility.objects.all().delete()
            Location.objects.all().delete()
            Ward.objects.all().delete()
            Zone.objects.all().delete()
            City.objects.all().delete()
            District.objects.all().delete()
            State.objects.all().delete()
            self.stdout.write("  Cleared.")

        self.stdout.write(self.style.SUCCESS("[OK] Odisha CityOS geographic data seeding started..."))

        # --- State ---
        odisha, created = State.objects.get_or_create(
            name="Odisha",
            defaults={"code": "OD", "country": "India"}
        )
        if created:
            self.stdout.write("  [+] State: Odisha")
        else:
            self.stdout.write("  [~] State: Odisha (already exists)")

        # --- Districts ---
        self.stdout.write("  Seeding 30 Odisha districts...")
        district_map = {}
        for dist_name, lat, lng in ODISHA_DISTRICTS:
            dist, created = District.objects.get_or_create(
                name=dist_name,
                state=odisha,
                defaults={"latitude": lat, "longitude": lng}
            )
            district_map[dist_name] = dist
            if created:
                self.stdout.write(f"    [+] District: {dist_name}")

        # --- Cities ---
        self.stdout.write("  Seeding demo cities...")
        city_map = {}
        for city_data in DEMO_CITIES:
            dist = district_map.get(city_data["district"])
            if not dist:
                self.stdout.write(self.style.WARNING(f"    ⚠ District not found: {city_data['district']}"))
                continue
            city, created = City.objects.get_or_create(
                name=city_data["name"],
                district=dist,
                defaults={
                    "latitude": city_data["lat"],
                    "longitude": city_data["lng"],
                    "population": city_data["population"],
                    "is_active": True,
                    "is_default": city_data["is_default"],
                }
            )
            city_map[city_data["name"]] = city
            marker = "+" if created else "~"
            default_tag = " [DEFAULT]" if city_data["is_default"] else ""
            self.stdout.write(f"    [{marker}] City: {city_data['name']}{default_tag}")

        # --- Cuttack Zones & Wards ---
        cuttack = city_map.get("Cuttack")
        if cuttack:
            self.stdout.write("  Seeding Cuttack zones and wards...")
            zone_map = {}
            for zone_name in CUTTACK_ZONES:
                zone, created = Zone.objects.get_or_create(
                    name=zone_name, city=cuttack
                )
                zone_map[zone_name] = zone
                if created:
                    self.stdout.write(f"    [+] Zone: {zone_name}")

            for ward_num, ward_name, zone_name in CUTTACK_WARDS:
                zone = zone_map.get(zone_name)
                ward, created = Ward.objects.get_or_create(
                    number=ward_num,
                    city=cuttack,
                    defaults={"name": ward_name, "zone": zone}
                )
                if created:
                    self.stdout.write(f"    [+] Ward {ward_num}: {ward_name}")

        # --- Generic Zones & Wards for other demo cities ---
        self.stdout.write("  Seeding generic zones and wards for other demo cities...")
        for city_name, num_zones in DEMO_CITY_ZONES.items():
            city = city_map.get(city_name)
            if not city:
                continue
            
            ward_counter = 1
            for z in range(1, num_zones + 1):
                zone_name = f"Zone {z}"
                zone, created = Zone.objects.get_or_create(
                    name=zone_name, city=city
                )
                if created:
                    self.stdout.write(f"    [+] {city_name} -> {zone_name}")
                
                # Create 5 wards per zone
                for _ in range(5):
                    ward_name = f"Ward {ward_counter}"
                    ward, w_created = Ward.objects.get_or_create(
                        number=ward_counter,
                        city=city,
                        defaults={"name": ward_name, "zone": zone}
                    )
                    if w_created:
                        self.stdout.write(f"      [+] {ward_name}")
                    ward_counter += 1

        # --- Facilities ---
        self.stdout.write("  Seeding demo facilities (is_demo=True)...")

        cuttack_dist = district_map.get("Cuttack")
        if cuttack and cuttack_dist:
            for f in CUTTACK_FACILITIES:
                facility, created = Facility.objects.get_or_create(
                    name=f["name"],
                    city=cuttack,
                    defaults={
                        "facility_type": f["type"],
                        "district": cuttack_dist,
                        "address": f["address"],
                        "latitude": f["lat"],
                        "longitude": f["lng"],
                        "phone": f["phone"],
                        "is_demo": True,
                        "notes": f["notes"],
                        "status": Facility.STATUS_ACTIVE,
                    }
                )
                if created:
                    self.stdout.write(f"    [+] Facility: {f['name']}")

        bbsr = city_map.get("Bhubaneswar")
        khordha = district_map.get("Khordha")
        if bbsr and khordha:
            for f in BHUBANESWAR_FACILITIES:
                facility, created = Facility.objects.get_or_create(
                    name=f["name"],
                    city=bbsr,
                    defaults={
                        "facility_type": f["type"],
                        "district": khordha,
                        "address": f["address"],
                        "latitude": f["lat"],
                        "longitude": f["lng"],
                        "phone": f["phone"],
                        "is_demo": True,
                        "notes": f["notes"],
                        "status": Facility.STATUS_ACTIVE,
                    }
                )
                if created:
                    self.stdout.write(f"    [OK] Facility: {f['name']}")

        self.stdout.write(self.style.SUCCESS("[+] Seeding SLA Configurations..."))
        from apps.complaints.models import SLAConfiguration
        sla_defaults = [
            {"priority": "CRITICAL", "res_mins": 120}, # 2 hours
            {"priority": "HIGH", "res_mins": 1440},    # 24 hours
            {"priority": "MEDIUM", "res_mins": 4320},  # 3 days
            {"priority": "LOW", "res_mins": 10080},    # 7 days
        ]
        for sla_data in sla_defaults:
            SLAConfiguration.objects.get_or_create(
                priority=sla_data["priority"],
                category__isnull=True,
                defaults={
                    "response_minutes": 60,
                    "resolution_minutes": sla_data["res_mins"]
                }
            )
        self.stdout.write(self.style.SUCCESS("    [OK] Default SLAs configured"))

        self.stdout.write(self.style.SUCCESS("[+] Seeding Emergency Alerts..."))
        from apps.emergency.models import EmergencyAlert
        from django.utils import timezone
        import datetime

        # Sample Cyclone Warning for Cuttack
        EmergencyAlert.objects.get_or_create(
            title="Cyclone Warning: Severe Cyclonic Storm",
            city=cuttack,
            defaults={
                "description": "A severe cyclonic storm is expected to hit the coastal areas. Please stay indoors and avoid traveling.",
                "severity": "CRITICAL",
                "status": "ACTIVE",
                "valid_until": timezone.now() + datetime.timedelta(days=2)
            }
        )
        
        # Sample Heatwave for Bhubaneswar
        EmergencyAlert.objects.get_or_create(
            title="Heatwave Alert",
            city=bbsr,
            defaults={
                "description": "Severe heatwave conditions are prevailing. Temperatures may cross 45°C. Stay hydrated and avoid direct sunlight during peak hours.",
                "severity": "WARNING",
                "status": "PUBLISHED",
                "valid_from": timezone.now(),
                "valid_until": timezone.now() + datetime.timedelta(days=5)
            }
        )
        self.stdout.write(self.style.SUCCESS("    [OK] Default Emergency Alerts configured"))

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("[DONE] Odisha seed data complete!"))
        self.stdout.write(self.style.SUCCESS(f"   States: {State.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"   Districts: {District.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"   Cities: {City.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"   Zones: {Zone.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"   Wards: {Ward.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"   Facilities: {Facility.objects.count()}"))
        self.stdout.write("")
        self.stdout.write(self.style.WARNING(
            "[DEMO MODE] All phone numbers are labeled DEMO-ONLY.\n"
            "   This data is for academic demonstration only.\n"
            "   Do not present this data as official government information."
        ))
