import sys
from django.core.management.base import BaseCommand
from rest_framework.test import APIClient
from apps.accounts.models import CustomUser, Department
from apps.complaints.models import Complaint, ComplaintHistory
from apps.notifications.models import Notification
from apps.geography.models import City, Ward

class Command(BaseCommand):
    help = "Run Full Role Communication & Workflow Integration Test"

    def __init__(self):
        super().__init__()
        self.results = []
        self.client = APIClient(SERVER_NAME="localhost")

    def log_result(self, module, role, action, expected, actual, status, reason=""):
        res = {
            "module": module,
            "role": role,
            "action": action,
            "expected": expected,
            "actual": actual,
            "status": status,
            "reason": reason,
        }
        self.results.append(res)
        color = self.style.SUCCESS if status == "PASS" else self.style.ERROR
        self.stdout.write(color(f"[{status}] {module} | {role} | {action}"))
        if status != "PASS":
            self.stdout.write(self.style.WARNING(f"  Reason: {reason}"))

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting E2E Audit..."))

        # Setup Test Users
        try:
            self.citizen = CustomUser.objects.get(email="citizen@cityos.gov")
            self.water_officer = CustomUser.objects.get(email="water.officer@cityos.gov")
            self.water_worker = CustomUser.objects.get(email="water.worker@cityos.gov")
            self.traffic_officer = CustomUser.objects.get(email="traffic.officer@cityos.gov")
            self.admin = CustomUser.objects.get(email="admin@cityos.gov")
            
            # Geography
            self.city = City.objects.first()
            self.ward = Ward.objects.filter(city=self.city).first()
            self.water_dept = Department.objects.get(code=Department.WATER)
            
            # Ensure citizen has a city
            if hasattr(self.citizen, 'profile'):
                self.citizen.profile.city_ref = self.city
                self.citizen.profile.save()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to find test data: {e}"))
            return

        # Execute tests
        self.test_main_communication_flow()
        self.test_notice_communication_flow()
        self.test_electricity_communication_flow()
        self.test_department_isolation()
        self.test_authorization()

        # Print summary
        self.print_summary()

    def as_user(self, user):
        self.client.force_authenticate(user=user)

    def test_main_communication_flow(self):
        module = "Water Supply Workflow"
        # 1. CITIZEN -> Creates complaint
        self.as_user(self.citizen)
        initial_notif_count = Notification.objects.filter(recipient=self.water_officer).count()
        
        payload = {
            "category": "WATER_SUPPLY",
            "title": "Water supply is unavailable",
            "description": "No water since morning",
            "ward_id": self.ward.id
        }
        res = self.client.post("/api/complaints/", payload, format="json")
        if res.status_code == 201:
            complaint_id = Complaint.objects.filter(citizen=self.citizen).latest('created_at').id
            self.log_result(module, "CITIZEN", "Create Complaint", "201 Created", f"{res.status_code}", "PASS")
        else:
            self.log_result(module, "CITIZEN", "Create Complaint", "201 Created", f"{res.status_code}", "FAIL", getattr(res, "data", res.content))
            return

        # Verify Notification to Officer
        new_notif = Notification.objects.filter(recipient=self.water_officer).count()
        if new_notif > initial_notif_count:
            self.log_result(module, "SYSTEM", "Notification Trigger", "Officer notified", "Officer notified", "PASS")
        else:
            self.log_result(module, "SYSTEM", "Notification Trigger", "Officer notified", "No notification", "FAIL", "Notification not created")

        # 2. OFFICER -> Assigns Field Worker
        self.as_user(self.water_officer)
        # Verify Officer can see it
        res = self.client.get(f"/api/complaints/{complaint_id}/")
        if res.status_code == 200:
            self.log_result(module, "OFFICER", "View Complaint", "200 OK", f"{res.status_code}", "PASS")
        else:
            self.log_result(module, "OFFICER", "View Complaint", "200 OK", f"{res.status_code}", "FAIL", "Officer cannot see complaint")

        # Assign worker
        worker_initial_notif = Notification.objects.filter(recipient=self.water_worker).count()
        res = self.client.post(f"/api/complaints/{complaint_id}/assign/", {"worker_id": self.water_worker.id, "assigned_to_id": self.water_worker.id}, format="json")
        if res.status_code == 200:
            self.log_result(module, "OFFICER", "Assign Worker", "200 OK", f"{res.status_code}", "PASS")
        else:
            self.log_result(module, "OFFICER", "Assign Worker", "200 OK", f"{res.status_code}", "FAIL", getattr(res, "data", res.content))

        # Verify Notification to Worker
        new_notif = Notification.objects.filter(recipient=self.water_worker).count()
        if new_notif > worker_initial_notif:
            self.log_result(module, "SYSTEM", "Notification Trigger", "Worker notified", "Worker notified", "PASS")
        else:
            self.log_result(module, "SYSTEM", "Notification Trigger", "Worker notified", "No notification", "FAIL", "Notification not created")

        # 3. WORKER -> Accepts -> On Site -> In Progress -> Resolved
        self.as_user(self.water_worker)
        # Check task list
        res = self.client.get("/api/complaints/worker/tasks/")
        task_id = None
        for t in res.data.get("results", []):
            if t["id"] == complaint_id:
                task_id = t["active_assignment"]["id"] if "active_assignment" in t and t["active_assignment"] else t["id"]
                break
        
        if task_id:
            self.log_result(module, "WORKER", "Receive Task", "Task visible", "Task visible", "PASS")
        else:
            self.log_result(module, "WORKER", "Receive Task", "Task visible", "Not visible", "FAIL", "Task not in worker's queue")
            return

        # Accept
        res = self.client.post(f"/api/complaints/worker/tasks/{complaint_id}/accept/")
        if res.status_code == 200:
            self.log_result(module, "WORKER", "Accept Task", "ACCEPTED", "ACCEPTED", "PASS")
        else:
            self.log_result(module, "WORKER", "Accept Task", "ACCEPTED", f"{res.status_code}", "FAIL")

        # In Progress (Requires moving through ON_SITE first)
        self.client.post(f"/api/complaints/worker/tasks/{complaint_id}/start-travel/")
        self.client.post(f"/api/complaints/worker/tasks/{complaint_id}/start-work/")
        
        # Verify Citizen sees IN_PROGRESS
        self.as_user(self.citizen)
        res = self.client.get(f"/api/complaints/{complaint_id}/")
        
        status_val = res.data.get("status") or res.data.get("data", {}).get("status")
        if status_val == "IN_PROGRESS":
            self.log_result(module, "CITIZEN", "Check Status", "IN_PROGRESS", status_val, "PASS")
        else:
            self.log_result(module, "CITIZEN", "Check Status", "IN_PROGRESS", status_val, "FAIL", "Citizen did not see real-time backend status")

        # Resolve
        self.as_user(self.water_worker)
        cit_notif_before = Notification.objects.filter(recipient=self.citizen).count()
        res = self.client.post(f"/api/complaints/worker/tasks/{complaint_id}/complete/", {"remarks": "Fixed it"}, format="json")
        
        if res.status_code == 200:
            self.log_result(module, "WORKER", "Resolve Task", "200 OK", f"{res.status_code}", "PASS")
        else:
            self.log_result(module, "WORKER", "Resolve Task", "200 OK", f"{res.status_code}", "FAIL")
            
        cit_notif_after = Notification.objects.filter(recipient=self.citizen).count()
        if cit_notif_after > cit_notif_before:
            self.log_result(module, "SYSTEM", "Notification Trigger", "Citizen notified", "Citizen notified", "PASS")
        else:
            self.log_result(module, "SYSTEM", "Notification Trigger", "Citizen notified", "No notification", "FAIL")

    def test_notice_communication_flow(self):
        module = "Water Notices"
        from django.utils import timezone
        now = timezone.now()

        # TEST 1: Officer Creates Notice
        self.as_user(self.water_officer)
        payload = {
            "city": self.city.id,
            "ward": self.ward.id,
            "notice_type": "PLANNED_CUT",
            "title": "Main Pipeline Maintenance",
            "description": "Routine check",
            "start_time": now.isoformat(),
            "status": "UPCOMING"
        }
        res = self.client.post("/api/water/notices/", payload, format="json")
        if res.status_code == 201:
            notice_id = res.data["id"]
            self.log_result(module, "OFFICER", "Create Notice", "201 Created", f"{res.status_code}", "PASS")
        else:
            self.log_result(module, "OFFICER", "Create Notice", "201 Created", f"{res.status_code}", "FAIL")
            return

        # Citizen Views Notice
        self.as_user(self.citizen)
        res = self.client.get("/api/water/notices/")
        found = any(n["id"] == notice_id for n in res.data["results"])
        if found:
            self.log_result(module, "CITIZEN", "View Notice", "Visible", "Visible", "PASS")
        else:
            self.log_result(module, "CITIZEN", "View Notice", "Visible", "Hidden", "FAIL")

        # TEST 2: Officer Edits Notice
        self.as_user(self.water_officer)
        res = self.client.patch(f"/api/water/notices/{notice_id}/", {"status": "IN_PROGRESS"}, format="json")
        if res.status_code == 200:
            self.log_result(module, "OFFICER", "Edit Notice", "200 OK", f"{res.status_code}", "PASS")
        else:
            self.log_result(module, "OFFICER", "Edit Notice", "200 OK", f"{res.status_code}", "FAIL")

        # Citizen sees Edit
        self.as_user(self.citizen)
        res = self.client.get(f"/api/water/notices/{notice_id}/")
        if res.status_code == 200 and res.data["status"] == "IN_PROGRESS":
            self.log_result(module, "CITIZEN", "See Notice Edit", "IN_PROGRESS", res.data["status"], "PASS")
        else:
            self.log_result(module, "CITIZEN", "See Notice Edit", "IN_PROGRESS", getattr(res, "data", {}).get("status", "FAIL"), "FAIL")

    def test_electricity_communication_flow(self):
        module = "Electricity Workflow"
        elec_officer = CustomUser.objects.get(email="electricity.officer@cityos.gov")
        elec_worker = CustomUser.objects.get(email="electricity.worker@cityos.gov")
        
        # CITIZEN Creates
        self.as_user(self.citizen)
        payload = {
            "category": "ELECTRICITY",
            "title": "Power out in Sector 9",
            "description": "No power since evening",
            "ward_id": self.ward.id
        }
        res = self.client.post("/api/complaints/", payload, format="json")
        if res.status_code == 201:
            complaint_id = Complaint.objects.filter(citizen=self.citizen).latest('created_at').id
            self.log_result(module, "CITIZEN", "Create Complaint", "201 Created", f"{res.status_code}", "PASS")
        else:
            self.log_result(module, "CITIZEN", "Create Complaint", "201 Created", f"{res.status_code}", "FAIL")
            return

        # OFFICER Assigns
        self.as_user(elec_officer)
        res = self.client.post(f"/api/complaints/{complaint_id}/assign/", {"worker_id": elec_worker.id, "assigned_to_id": elec_worker.id}, format="json")
        if res.status_code == 200:
            self.log_result(module, "OFFICER", "Assign Worker", "200 OK", f"{res.status_code}", "PASS")
        else:
            self.log_result(module, "OFFICER", "Assign Worker", "200 OK", f"{res.status_code}", "FAIL")

        # WORKER Accepts & Completes
        self.as_user(elec_worker)
        res = self.client.post(f"/api/complaints/worker/tasks/{complaint_id}/accept/")
        if res.status_code == 200:
            self.log_result(module, "WORKER", "Accept Task", "200 OK", f"{res.status_code}", "PASS")
        else:
            self.log_result(module, "WORKER", "Accept Task", "200 OK", f"{res.status_code}", "FAIL")
            
        self.client.post(f"/api/complaints/worker/tasks/{complaint_id}/start-travel/")
        self.client.post(f"/api/complaints/worker/tasks/{complaint_id}/start-work/")
        res = self.client.post(f"/api/complaints/worker/tasks/{complaint_id}/complete/", {"remarks": "Fixed it"}, format="json")
        if res.status_code == 200:
            self.log_result(module, "WORKER", "Complete Task", "200 OK", f"{res.status_code}", "PASS")
        else:
            self.log_result(module, "WORKER", "Complete Task", "200 OK", f"{res.status_code}", "FAIL")

    def test_department_isolation(self):
        module = "Department Isolation"
        
        # Traffic officer tries to access Water complaint
        water_comp = Complaint.objects.filter(department__code=Department.WATER).first()
        if not water_comp:
            self.log_result(module, "OFFICER", "Cross-dept read", "N/A", "N/A", "FAIL", "No water complaints to test")
            return

        self.as_user(self.traffic_officer)
        
        res = self.client.get(f"/api/complaints/{water_comp.id}/")
        if res.status_code in [403, 404]:
            self.log_result(module, "OFFICER", "Cross-dept read", "403/404 Error", f"{res.status_code}", "PASS")
        else:
            self.log_result(module, "OFFICER", "Cross-dept read", "403/404 Error", f"{res.status_code}", "FAIL", "Traffic officer can read water complaints")
            
        res = self.client.post(f"/api/complaints/{water_comp.id}/assign/", {"assigned_to_id": self.water_worker.id}, format="json")
        if res.status_code in [403, 404]:
            self.log_result(module, "OFFICER", "Cross-dept assign", "403/404 Error", f"{res.status_code}", "PASS")
        else:
            self.log_result(module, "OFFICER", "Cross-dept assign", "403/404 Error", f"{res.status_code}", "FAIL")
            
    def test_authorization(self):
        module = "Authorization"
        
        # Citizen tries to access tasks
        self.as_user(self.citizen)
        res = self.client.get("/api/complaints/tasks/")
        if res.status_code == 403:
            self.log_result(module, "CITIZEN", "Access Officer API", "403 Forbidden", f"{res.status_code}", "PASS")
        else:
            self.log_result(module, "CITIZEN", "Access Officer API", "403 Forbidden", f"{res.status_code}", "FAIL", "Citizen can access worker tasks")
            
        # Worker tries to create user
        self.as_user(self.water_worker)
        res = self.client.post("/api/auth/staff/create/", {"email": "hack@city.gov"})
        if res.status_code == 403:
            self.log_result(module, "WORKER", "Access Admin API", "403 Forbidden", f"{res.status_code}", "PASS")
        else:
            self.log_result(module, "WORKER", "Access Admin API", "403 Forbidden", f"{res.status_code}", "FAIL")
            
    def print_summary(self):
        import json
        with open("audit_results.json", "w") as f:
            json.dump(self.results, f)
        self.stdout.write(self.style.SUCCESS("Done! Output saved to audit_results.json"))
