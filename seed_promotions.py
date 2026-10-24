"""
seed_promotions.py
==================
Populates production-ready official announcements and campaigns.
"""
from django.utils import timezone
from datetime import timedelta
from apps.notifications.models import Announcement, AnnouncementInteraction
from apps.accounts.models import CustomUser, Department, Role

admin = CustomUser.objects.filter(role__name=Role.SUPER_ADMIN).first()
if not admin:
    admin = CustomUser.objects.filter(is_superuser=True).first()

dept_health = Department.objects.filter(code="CITIZEN_SERVICES").first()
dept_waste = Department.objects.filter(code="WASTE").first()
dept_emergency = Department.objects.filter(code="EMERGENCY").first()
dept_electricity = Department.objects.filter(code="ELECTRICITY").first()
dept_traffic = Department.objects.filter(code="TRAFFIC").first()
dept_water = Department.objects.filter(code="WATER").first()
dept_transport = Department.objects.filter(code="TRANSPORT").first()

now = timezone.now()

# Clear existing sample announcements to refresh with production-grade data
Announcement.objects.all().delete()

# 1. BSKY Health Card (Featured #1)
a1 = Announcement.objects.create(
    title="Biju Swasthya Kalyan Yojana (BSKY) Universal Health Coverage",
    summary="Universal cashless healthcare coverage up to ₹5 Lakh per family (₹10 Lakh for women) across 4,500+ empaneled hospitals nationwide.",
    content="""### Universal Cashless Healthcare for All Odisha Citizens

The Government of Odisha is pleased to announce the expanded annual benefits under the **Biju Swasthya Kalyan Yojana (BSKY)**.

#### Key Benefits:
* **Cashless treatment** up to ₹5,00,000 per family per annum.
* Enhanced coverage up to **₹10,00,000 for female members** of the family.
* Valid in over **4,500 empaneled premier hospitals** across Odisha and major metro healthcare hubs.
* 100% cashless diagnostics, surgery, ICU care, and post-operative medications.

#### Grievance Redressal:
Citizens facing billing discrepancies or refusal of admission at empaneled hospitals can immediately contact the **24x7 BSKY Help Desk at 104** or lodge a direct complaint via Odisha CityOS.""",
    category="WELFARE_SCHEME",
    department=dept_health,
    department_name="Department of Health & Family Welfare",
    banner_image_url="/banners/welfare_scheme.svg",
    thumbnail_image_url="/banners/welfare_scheme.svg",
    is_featured=True,
    is_pinned=True,
    display_order=1,
    priority="HIGH",
    status="PUBLISHED",
    audience_scope="ALL",
    cta_label="Check Eligibility",
    cta_type="INTERNAL",
    cta_destination="/citizen/services",
    secondary_cta_label="View Empaneled Hospitals",
    secondary_cta_type="INTERNAL",
    secondary_cta_destination="/citizen/announcements",
    publish_at=now - timedelta(days=2),
    published_at=now - timedelta(days=2),
    expires_at=now + timedelta(days=90),
    created_by=admin,
)

# 2. Clean City Mission (Featured #2)
a2 = Announcement.objects.create(
    title="Ama Sahar, Swachha Sahar — 100% Clean Ward Cleanliness Mission",
    summary="Join the city-wide clean ward mission. Door-to-door segregated collection, green composting kits, and citizen volunteer recognitions.",
    content="""### Ama Sahar, Swachha Sahar Cleanliness Drive 2026

Bhubaneswar & Cuttack Municipal Corporations invite all citizens, resident welfare associations, and youth clubs to join the **Ama Sahar Cleanliness Mission**.

#### Programme Highlights:
1. **Source Segregation:** Mandatory green bin (wet organic waste) and blue bin (dry recyclable waste) segregation across all wards.
2. **Ward Cleanliness Drives:** Weekly Saturday volunteer cleanups in parks, market complexes, and public spaces.
3. **Composting Kits for RWAs:** Free home composting starter kits distributed at ward municipal offices.
4. **Cleanest Ward Award:** Top 3 performing wards will receive municipal development grants of ₹25 Lakh each.""",
    category="CITY_CAMPAIGN",
    department=dept_waste,
    department_name="Housing & Urban Development Department",
    banner_image_url="/banners/city_campaign.svg",
    thumbnail_image_url="/banners/city_campaign.svg",
    is_featured=True,
    is_pinned=False,
    display_order=2,
    priority="NORMAL",
    status="PUBLISHED",
    audience_scope="ALL",
    cta_label="Join Ward Campaign",
    cta_type="INTERNAL",
    cta_destination="/citizen/waste",
    secondary_cta_label="Collection Schedule",
    secondary_cta_type="INTERNAL",
    secondary_cta_destination="/citizen/waste",
    publish_at=now - timedelta(days=1),
    published_at=now - timedelta(days=1),
    expires_at=now + timedelta(days=60),
    created_by=admin,
)

# 3. Emergency Advisory (Featured #3, Priority EMERGENCY)
a3 = Announcement.objects.create(
    title="IMD Coastal Cyclone & Severe Rainfall Advisory",
    summary="Special Relief Commissioner Alert: Heavy to very heavy rainfall expected across coastal Odisha. ODRAF teams deployed. 24x7 control rooms active.",
    content="""### Special Relief Commissioner (SRC) Advisory: Severe Weather Warning

The India Meteorological Department (IMD) has issued a **Red Warning** for coastal Odisha districts including Puri, Jagatsinghpur, Kendrapara, Khurda, and Cuttack.

#### Safety Directives:
* **Fishermen Warning:** Total prohibition on venturing into the sea until further notice.
* **Low-Lying Areas:** Residents in vulnerable coastal and riverine pockets are advised to move to designated Multipurpose Cyclone Shelters.
* **Emergency Supplies:** Keep adequate drinking water, non-perishable food, flashlights, and vital medicines ready.
* **Municipal Helplines:**
  * State Emergency Operations Centre (SEOC): **1070**
  * District Control Room: **112**
  * Odisha CityOS SOS Hotline active.""",
    category="EMERGENCY_ALERT",
    department=dept_emergency,
    department_name="Disaster Management Authority",
    banner_image_url="/banners/emergency_alert.svg",
    thumbnail_image_url="/banners/emergency_alert.svg",
    is_featured=True,
    is_pinned=True,
    display_order=0,
    priority="EMERGENCY",
    status="PUBLISHED",
    audience_scope="ALL",
    cta_label="Emergency SOS & Helplines",
    cta_type="INTERNAL",
    cta_destination="/citizen/emergency",
    secondary_cta_label="Safety Protocol",
    secondary_cta_type="INTERNAL",
    secondary_cta_destination="/citizen/emergency",
    publish_at=now - timedelta(hours=6),
    published_at=now - timedelta(hours=6),
    expires_at=now + timedelta(days=5),
    created_by=admin,
)

# 4. Planned Power Shutdown
a4 = Announcement.objects.create(
    title="Planned Substation Maintenance — Nayapalli & CDA Sectors",
    summary="TPCODL scheduled power shutdown on Sunday (10:00 AM – 01:00 PM) for 33kV line upgrade and transformer maintenance.",
    content="""### Power Supply Interruption Notice

TPCODL informs electricity consumers of Nayapalli (Bhubaneswar) and CDA Sector 1–6 (Cuttack) regarding planned maintenance work:

* **Date:** Upcoming Sunday
* **Time:** 10:00 AM to 01:00 PM (3 Hours)
* **Affected Areas:** Nayapalli Behera Sahi, IRC Village, CDA Sector 1 to 6.
* **Reason:** Preventive maintenance and feeder re-conductoring to prevent monsoon tripping.

Essential emergency services and hospitals will receive dedicated backup feed.""",
    category="ELECTRICITY",
    department=dept_electricity,
    department_name="TP Central Odisha Distribution Ltd.",
    banner_image_url="/banners/announcement.svg",
    thumbnail_image_url="/banners/announcement.svg",
    is_featured=False,
    is_pinned=False,
    display_order=3,
    priority="HIGH",
    status="PUBLISHED",
    audience_scope="ALL",
    cta_label="View Feeder Schedule",
    cta_type="INTERNAL",
    cta_destination="/citizen/electricity",
    publish_at=now - timedelta(hours=12),
    published_at=now - timedelta(hours=12),
    expires_at=now + timedelta(days=7),
    created_by=admin,
)

# 5. Traffic NH-16 Widening
a5 = Announcement.objects.create(
    title="NH-16 Bhubaneswar–Khurda Road Widening & Flyover Works",
    summary="Lane diversions active between Khandagiri and Palasuni junction. Commuters are advised to utilize outer ring road during peak hours.",
    content="""### NH-16 Traffic Diversion Advisory

National Highways Authority of India (NHAI) in coordination with Bhubaneswar-Cuttack Police Commissionerate has implemented traffic diversions on NH-16.

* Construction of the 6-lane elevated flyover is entering the girder launching phase.
* Peak morning (08:30–11:00 AM) and evening (05:30–08:30 PM) traffic will experience minor slowdowns.
* Follow digital variable messaging signboards (VMS) along the corridor.""",
    category="TRAFFIC",
    department=dept_traffic,
    department_name="Commissioner of Police & NHAI",
    banner_image_url="/banners/traffic.svg",
    thumbnail_image_url="/banners/traffic.svg",
    is_featured=False,
    is_pinned=False,
    display_order=4,
    priority="NORMAL",
    status="PUBLISHED",
    audience_scope="ALL",
    cta_label="Live Traffic Map",
    cta_type="INTERNAL",
    cta_destination="/citizen/traffic",
    publish_at=now - timedelta(days=3),
    published_at=now - timedelta(days=3),
    expires_at=now + timedelta(days=30),
    created_by=admin,
)

# 6. Smart Water Metering
a6 = Announcement.objects.create(
    title="WATCO Smart AMR Water Meter Installation Drive",
    summary="Zero-cost digital ultrasonic water meter replacement across 15,000 households in Cuttack municipal jurisdiction.",
    content="""### 24x7 Drink From Tap Mission: Smart Meter Upgrade

WATCO (Water Corporation of Odisha) is rolling out smart automated meter reading (AMR) units:

* **Zero Cost:** The meter hardware and installation are completely free of charge.
* **Benefits:** Transparent billing, instant leak detection alerts on CityOS, and continuous pressure monitoring.
* Verified WATCO technicians will carry government ID cards and uniform jackets.""",
    category="WATER",
    department=dept_water,
    department_name="Water Corporation of Odisha (WATCO)",
    banner_image_url="/banners/announcement.svg",
    thumbnail_image_url="/banners/announcement.svg",
    is_featured=False,
    is_pinned=False,
    display_order=5,
    priority="NORMAL",
    status="PUBLISHED",
    audience_scope="ALL",
    cta_label="Water Services Portal",
    cta_type="INTERNAL",
    cta_destination="/citizen/water",
    publish_at=now - timedelta(days=4),
    published_at=now - timedelta(days=4),
    expires_at=now + timedelta(days=45),
    created_by=admin,
)

# 7. Mo Bus Route Expansion
a7 = Announcement.objects.create(
    title="Mo Bus Route 11A Expansion: Biju Patnaik Airport to Cuttack Badambadi",
    summary="CRUT announces new AC electric bus services every 15 minutes connecting Bhubaneswar Airport directly to Cuttack Badambadi terminus.",
    content="""### Capital Region Urban Transport (CRUT) Expansion

To enhance eco-friendly public transit across the Twin Cities, Route 11A is now live:

* **Fleet:** 100% Zero-emission electric AC low-floor buses.
* **Frequency:** Departures every 15 minutes from 06:00 AM to 10:30 PM daily.
* **Concessions:** 50% discount for students, senior citizens, and persons with disabilities.
* Live vehicle tracking and contactless QR ticketing integrated in CityOS.""",
    category="TRANSPORT",
    department=dept_transport,
    department_name="Capital Region Urban Transport (CRUT)",
    banner_image_url="/banners/announcement.svg",
    thumbnail_image_url="/banners/announcement.svg",
    is_featured=False,
    is_pinned=False,
    display_order=6,
    priority="NORMAL",
    status="PUBLISHED",
    audience_scope="ALL",
    cta_label="View Bus Timetable",
    cta_type="INTERNAL",
    cta_destination="/citizen/transport",
    publish_at=now - timedelta(days=2),
    published_at=now - timedelta(days=2),
    expires_at=now + timedelta(days=60),
    created_by=admin,
)

# 8. Draft Campaign for Admin testing
a8 = Announcement.objects.create(
    title="Odisha Rooftop Solar Subsidy Phase-IV (Draft)",
    summary="Under inter-departmental review by OREDA and Energy Department.",
    content="Draft scheme guidelines awaiting Cabinet approval.",
    category="WELFARE_SCHEME",
    department=dept_electricity,
    status="DRAFT",
    is_featured=False,
    priority="NORMAL",
    created_by=admin,
)

# Seed realistic analytics interactions
import random
for ann in [a1, a2, a3, a4, a5, a6, a7]:
    imp_count = random.randint(45, 120)
    click_count = random.randint(8, 35)
    for _ in range(imp_count):
        AnnouncementInteraction.objects.create(
            announcement=ann,
            event_type="IMPRESSION",
            timestamp=now - timedelta(hours=random.randint(1, 48)),
        )
    for _ in range(click_count):
        AnnouncementInteraction.objects.create(
            announcement=ann,
            event_type="CLICK",
            destination=ann.cta_destination,
            timestamp=now - timedelta(hours=random.randint(1, 48)),
        )
    for _ in range(random.randint(10, 25)):
        AnnouncementInteraction.objects.create(
            announcement=ann,
            event_type="VIEW",
            timestamp=now - timedelta(hours=random.randint(1, 48)),
        )

print(f"Successfully seeded {Announcement.objects.count()} announcements and {AnnouncementInteraction.objects.count()} analytics events!")
