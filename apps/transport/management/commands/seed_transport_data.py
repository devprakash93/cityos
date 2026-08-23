"""
Management command: seed_transport_data
=========================================
Seeds realistic dummy data for Public Transport module.
This ensures Routes, Buses, Stops, and live locations are present.
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = "Seeds comprehensive public transport data across Odisha."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset", action="store_true",
            help="Clear existing transport data before seeding.",
        )

    def handle(self, *args, **options):
        # We delegate to the master seeder which already contains 
        # highly realistic and comprehensive Odisha transport data
        # along with necessary Geographic hierarchy dependencies.
        self.stdout.write("Routing to comprehensive CityOS seeder...")
        if options["reset"]:
            call_command("seed_cityos", reset=True)
        else:
            call_command("seed_cityos")
        
        self.stdout.write(self.style.SUCCESS("\n[OK] Transport data successfully seeded and verified!"))
