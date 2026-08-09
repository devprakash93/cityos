"""
apps/iot_simulator/views.py
===========================
Admin-accessible API to trigger simulator ticks and view status.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from core.permissions import IsSuperAdmin
from .simulator import CitySimulator


@extend_schema(tags=["simulator"])
class SimulatorTickView(APIView):
    """
    POST /api/simulator/trigger/
    Force an immediate simulation tick. Super admin only.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request):
        sim = CitySimulator()
        results = sim.tick()
        return Response({"success": True, "message": "Simulator tick executed.", "results": results})


@extend_schema(tags=["simulator"])
class SimulatorResetView(APIView):
    """
    POST /api/simulator/reset/
    Clear all IoT readings back to baseline. Super admin only.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request):
        sim = CitySimulator()
        sim.reset()
        return Response({"success": True, "message": "All IoT readings cleared."})


@extend_schema(tags=["simulator"])
class SimulatorStatusView(APIView):
    """
    GET /api/simulator/status/
    Returns reading counts across all domains.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        from apps.traffic.models import TrafficReading
        from apps.waste.models import WasteBinReading
        from apps.water.models import WaterReading
        from apps.electricity.models import ElectricityReading
        from apps.transport.models import BusLocation
        from apps.pollution.models import AQIReading

        return Response({
            "reading_counts": {
                "traffic": TrafficReading.objects.count(),
                "waste": WasteBinReading.objects.count(),
                "water": WaterReading.objects.count(),
                "electricity": ElectricityReading.objects.count(),
                "transport": BusLocation.objects.count(),
                "pollution": AQIReading.objects.count(),
            }
        })

@extend_schema(tags=["simulator"])
class DemoModeConfigView(APIView):
    """
    GET /api/simulator/demo-mode/
    POST /api/simulator/demo-mode/
    Get or set the Demo Mode configuration.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        from .models import DemoModeConfig
        config = DemoModeConfig.objects.first()
        if not config:
            config = DemoModeConfig.objects.create(is_enabled=False, interval_seconds=10)
        return Response({
            "is_enabled": config.is_enabled,
            "interval_seconds": config.interval_seconds,
            "last_run_at": config.last_run_at,
        })

    def post(self, request):
        from .models import DemoModeConfig
        config = DemoModeConfig.objects.first()
        if not config:
            config = DemoModeConfig.objects.create(is_enabled=False, interval_seconds=10)
        
        is_enabled = request.data.get("is_enabled", config.is_enabled)
        interval_seconds = request.data.get("interval_seconds", config.interval_seconds)

        config.is_enabled = is_enabled
        config.interval_seconds = interval_seconds
        config.updated_by = request.user
        config.save()

        return Response({
            "success": True,
            "is_enabled": config.is_enabled,
            "interval_seconds": config.interval_seconds,
        })

@extend_schema(tags=["simulator"])
class SimulationEventView(APIView):
    """
    POST /api/simulator/events/
    Trigger a specific event. Payload requires 'event_type' and 'city_id'.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request):
        from .models import SimulationEvent
        from apps.geography.models import City

        event_type = request.data.get("event_type")
        city_id = request.data.get("city_id")
        severity = request.data.get("severity", "WARNING")
        payload = request.data.get("payload", {})

        if not event_type or not city_id:
            return Response({"error": "event_type and city_id are required."}, status=400)

        try:
            city = City.objects.get(id=city_id)
        except City.DoesNotExist:
            return Response({"error": "City not found."}, status=404)

        event = SimulationEvent.objects.create(
            event_type=event_type,
            city=city,
            severity=severity,
            payload=payload,
            triggered_by=request.user
        )

        return Response({
            "success": True, 
            "message": f"Event {event_type} registered and waiting for processing.",
            "event_id": event.id
        })

