import time
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.iot_simulator.models import DemoModeConfig, SimulationEvent
from apps.iot_simulator.simulator import CitySimulator

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Runs the continuous Demo Mode engine. Only ticks if DemoModeConfig is enabled."

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting Demo Mode Engine..."))
        sim = CitySimulator()

        while True:
            config = DemoModeConfig.objects.first()
            if not config:
                config = DemoModeConfig.objects.create(is_enabled=False, interval_seconds=10)

            # 1. Process pending explicit SimulationEvents (regardless of demo mode)
            pending_events = SimulationEvent.objects.filter(is_processed=False)
            for event in pending_events:
                self.stdout.write(f"[{timezone.now().isoformat()}] Processing Event: {event.event_type} for {event.city.name}")
                try:
                    sim.process_event(event)
                    event.is_processed = True
                    event.processed_at = timezone.now()
                    event.save()
                    self.stdout.write(self.style.SUCCESS(f"  --> Event processed successfully"))
                except Exception as e:
                    event.is_processed = True
                    event.error_message = str(e)
                    event.processed_at = timezone.now()
                    event.save()
                    self.stderr.write(self.style.ERROR(f"  --> Event failed: {e}"))

            # 2. Run continuous demo mode if enabled
            if config.is_enabled:
                self.stdout.write(f"[{timezone.now().isoformat()}] Demo Mode ON. Running tick()...")
                try:
                    results = sim.tick()
                    
                    # Update config timestamp
                    config.last_run_at = timezone.now()
                    config.save(update_fields=["last_run_at"])
                    
                    summary = ", ".join(f"{k}: {v}" for k, v in results.items() if k != "timestamp")
                    self.stdout.write(self.style.SUCCESS(f"  --> Tick completed. Written: {summary}"))
                except Exception as e:
                    self.stderr.write(self.style.ERROR(f"  --> Error during tick: {e}"))
            else:
                pass # Silent when off so it doesn't spam logs
                
            time.sleep(config.interval_seconds)
