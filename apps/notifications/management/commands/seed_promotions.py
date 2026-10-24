from django.core.management.base import BaseCommand
import subprocess
import sys
from pathlib import Path


class Command(BaseCommand):
    help = "Seed official announcements and promotional civic campaigns."

    def handle(self, *args, **options):
        self.stdout.write("Seeding Odisha CityOS announcements and campaigns...")
        root_dir = Path(__file__).resolve().parent.parent.parent.parent.parent
        script_path = root_dir / "seed_promotions.py"
        if script_path.exists():
            with open(script_path, "r", encoding="utf-8") as f:
                code = compile(f.read(), str(script_path), "exec")
                exec(code, {"__name__": "__main__"})
            self.stdout.write(self.style.SUCCESS("Successfully seeded official announcements & civic campaigns!"))
        else:
            self.stdout.write(self.style.ERROR(f"Could not find seed script at {script_path}"))
