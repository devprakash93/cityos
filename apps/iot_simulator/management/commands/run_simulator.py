"""
Management command: run_simulator
Usage:
    python manage.py run_simulator
    python manage.py run_simulator --tick-interval=5 --ticks=100
    python manage.py run_simulator --ticks=1  (single tick)
"""
import time
from django.core.management.base import BaseCommand
from apps.iot_simulator.simulator import CitySimulator


class Command(BaseCommand):
    help = "Run the CityOS IoT data simulator."

    def add_arguments(self, parser):
        parser.add_argument(
            "--tick-interval",
            type=float,
            default=10.0,
            help="Seconds between ticks (default: 10)",
        )
        parser.add_argument(
            "--ticks",
            type=int,
            default=None,
            help="Number of ticks to run (default: infinite until Ctrl+C)",
        )

    def handle(self, *args, **options):
        interval = options["tick_interval"]
        max_ticks = options["ticks"]
        simulator = CitySimulator()

        self.stdout.write(self.style.SUCCESS(
            f"🏙️  CityOS IoT Simulator started. "
            f"Tick interval: {interval}s. "
            f"Ticks: {'∞' if max_ticks is None else max_ticks}"
        ))

        tick_count = 0
        try:
            while max_ticks is None or tick_count < max_ticks:
                results = simulator.tick()
                tick_count += 1
                self.stdout.write(
                    f"[Tick #{tick_count}] {results['timestamp']} | "
                    f"Traffic:{results['traffic']} "
                    f"Waste:{results['waste']} "
                    f"Water:{results['water']} "
                    f"Electricity:{results['electricity']} "
                    f"Transport:{results['transport']} "
                    f"Pollution:{results['pollution']}"
                )
                if max_ticks is None or tick_count < max_ticks:
                    time.sleep(interval)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING(
                f"\n⏹  Simulator stopped after {tick_count} ticks."
            ))
