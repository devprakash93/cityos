from django.urls import path
from . import views

urlpatterns = [
    path("complaints/summary/", views.ComplaintSummaryView.as_view(), name="analytics-complaints-summary"),
    path("complaints/trend/", views.ComplaintTrendView.as_view(), name="analytics-complaints-trend"),
    path("aqi/history/", views.AQIHistoryView.as_view(), name="analytics-aqi-history"),
    path("traffic/heatmap/", views.TrafficHeatmapView.as_view(), name="analytics-traffic-heatmap"),
    path("waste/collection-efficiency/", views.WasteCollectionEfficiencyView.as_view(), name="analytics-waste"),
    path("electricity/outage-stats/", views.OutageStatsView.as_view(), name="analytics-electricity"),
    path("transport/ridership/", views.TransportRidershipView.as_view(), name="transport-ridership"),
    path("reports/download/", views.ReportDownloadView.as_view(), name="reports-download"),
    path("system/health/", views.SystemHealthView.as_view(), name="system-health"),
]
