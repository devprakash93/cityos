import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, RoleRoute } from './routes/RoleRoute';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import CitizenLayout from './layouts/CitizenLayout';
import OfficerLayout from './layouts/OfficerLayout';
import WorkerLayout from './layouts/WorkerLayout';
import AdminLayout from './layouts/AdminLayout';

// Auth Pages
import Login from './pages/auth/Login';

// Citizen Pages
import CitizenDashboard from './pages/citizen/Dashboard';
import ReportComplaint from './pages/citizen/ReportComplaint';
import MyComplaints from './pages/citizen/MyComplaints';
import ComplaintDetail from './pages/citizen/ComplaintDetail';
import Traffic from './pages/citizen/Traffic';
import PublicTransport from './pages/citizen/PublicTransport';
import WaterSupply from './pages/citizen/WaterSupply';
import Electricity from './pages/citizen/Electricity';
import WasteManagement from './pages/citizen/WasteManagement';
import Pollution from './pages/citizen/Pollution';
import Emergency from './pages/citizen/Emergency';
import Announcements from './pages/citizen/Announcements';
import Statistics from './pages/citizen/Statistics';
import CitizenSettings from './pages/citizen/Settings';
import ActivityHistory from './pages/citizen/ActivityHistory';
import CityServices from './pages/citizen/CityServices';

// Officer Pages
import OfficerDashboard from './pages/officer/Dashboard';
import OfficerComplaints from './pages/officer/Complaints';
import OfficerComplaintDetail from './pages/officer/ComplaintDetail';
import OfficerWorkers from './pages/officer/Workers';
import OfficerTasks from './pages/officer/Tasks';
import OfficerMap from './pages/officer/Map';
import OfficerService from './pages/officer/Service';
import OfficerAnalytics from './pages/officer/Analytics';
import OfficerReports from './pages/officer/Reports';
import OfficerSLA from './pages/officer/SLA';

// Worker Pages
import WorkerDashboard from './pages/worker/Dashboard';
import WorkerTasks from './pages/worker/Tasks';
import WorkerTaskDetail from './pages/worker/TaskDetail';
import WorkerMap from './pages/worker/Map';
import WorkerPerformance from './pages/worker/Performance';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import CityMapDashboard from './pages/admin/CityMapDashboard';
import UsersManagement from './pages/admin/UsersManagement';
import GeographyManagement from './pages/admin/GeographyManagement';
import DistrictDetails from './pages/admin/geography/DistrictDetails';
import CityDetails from './pages/admin/geography/CityDetails';
import ZoneDetails from './pages/admin/geography/ZoneDetails';
import WardDetails from './pages/admin/geography/WardDetails';
import DepartmentsManagement from './pages/admin/DepartmentsManagement';
import AnnouncementsManagement from './pages/admin/AnnouncementsManagement';
import AuditLogs from './pages/admin/AuditLogs';
import Reports from './pages/admin/Reports';
import AdminAnalytics from './pages/admin/Analytics';
import IoTControlRoom from './pages/admin/IoTControlRoom';
import ComplaintsAdmin from './pages/admin/ComplaintsAdmin';
import EmergencyControl from './pages/admin/EmergencyControl';
import DisasterManagement from './pages/admin/DisasterManagement';
import SystemHealth from './pages/admin/SystemHealth';
import TrafficMonitor from './pages/admin/TrafficMonitor';
import GenericServicePage from './pages/admin/GenericServicePage';
import { Trash2, Droplets, Zap, Bus, Wind } from 'lucide-react';

// Shared Pages
import Notifications from './pages/shared/Notifications';
import Profile from './pages/shared/Profile';
import ComingSoon from './pages/ComingSoon';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public / Auth */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Route>

          {/* Protected Routes Wrapper */}
          <Route element={<ProtectedRoute />}>
            {/* Citizen Routes */}
            <Route element={<RoleRoute allowedRoles={['CITIZEN']} />}>
              <Route element={<CitizenLayout />}>
                <Route path="/citizen/dashboard" element={<CitizenDashboard />} />
                <Route path="/citizen/profile" element={<Profile />} />
                <Route path="/citizen/report" element={<ReportComplaint />} />
                <Route path="/citizen/complaints" element={<MyComplaints />} />
                <Route path="/citizen/complaints/:id" element={<ComplaintDetail />} />
                <Route path="/citizen/activity" element={<ActivityHistory />} />
                <Route path="/citizen/traffic" element={<Traffic />} />
                <Route path="/citizen/transport" element={<PublicTransport />} />
                <Route path="/citizen/water" element={<WaterSupply />} />
                <Route path="/citizen/electricity" element={<Electricity />} />
                <Route path="/citizen/waste" element={<WasteManagement />} />
                <Route path="/citizen/pollution" element={<Pollution />} />
                <Route path="/citizen/emergency" element={<Emergency />} />
                <Route path="/citizen/announcements" element={<Announcements />} />
                <Route path="/citizen/notifications" element={<Notifications />} />
                <Route path="/citizen/statistics" element={<Statistics />} />
                <Route path="/citizen/settings" element={<CitizenSettings />} />
                <Route path="/citizen/services" element={<CityServices />} />
              </Route>
            </Route>

            {/* Officer Routes */}
            <Route element={<RoleRoute allowedRoles={['OFFICER']} />}>
              <Route element={<OfficerLayout />}>
                <Route path="/officer/dashboard" element={<OfficerDashboard />} />
                <Route path="/officer/complaints" element={<OfficerComplaints />} />
                <Route path="/officer/complaints/:id" element={<OfficerComplaintDetail />} />
                <Route path="/officer/workers" element={<OfficerWorkers />} />
                <Route path="/officer/tasks" element={<OfficerTasks />} />
                <Route path="/officer/map" element={<OfficerMap />} />
                <Route path="/officer/service" element={<OfficerService />} />
                <Route path="/officer/analytics" element={<OfficerAnalytics />} />
                <Route path="/officer/reports" element={<OfficerReports />} />
                <Route path="/officer/sla" element={<OfficerSLA />} />
                <Route path="/officer/notifications" element={<Notifications />} />
                <Route path="/officer/profile" element={<Profile />} />
              </Route>
            </Route>

            {/* Worker Routes */}
            <Route element={<RoleRoute allowedRoles={['FIELD_WORKER']} />}>
              <Route element={<WorkerLayout />}>
                <Route path="/worker/dashboard" element={<WorkerDashboard />} />
                <Route path="/worker/tasks" element={<WorkerTasks />} />
                <Route path="/worker/tasks/:id" element={<WorkerTaskDetail />} />
                <Route path="/worker/map" element={<WorkerMap />} />
                <Route path="/worker/performance" element={<WorkerPerformance />} />
                <Route path="/worker/notifications" element={<Notifications />} />
                <Route path="/worker/profile" element={<Profile />} />
              </Route>
            </Route>

            {/* Admin Routes */}
            <Route element={<RoleRoute allowedRoles={['SUPER_ADMIN']} />}>
              <Route element={<AdminLayout />}>
                {/* Overview */}
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/map" element={<CityMapDashboard />} />

                {/* Operations */}
                <Route path="/admin/complaints" element={<ComplaintsAdmin />} />
                <Route path="/admin/complaints/:id" element={<OfficerComplaintDetail />} />
                <Route path="/admin/emergency" element={<EmergencyControl />} />
                <Route path="/admin/disaster" element={<DisasterManagement />} />

                {/* City Services */}
                <Route path="/admin/traffic" element={<TrafficMonitor />} />
                <Route path="/admin/waste" element={<GenericServicePage title="Waste Management" icon={Trash2} endpoint="/waste/bins/" color="bg-stone-500" />} />
                <Route path="/admin/water" element={<GenericServicePage title="Water Supply" icon={Droplets} endpoint="/water/readings/" color="bg-blue-500" />} />
                <Route path="/admin/electricity" element={<GenericServicePage title="Electricity" icon={Zap} endpoint="/electricity/readings/" color="bg-yellow-500" />} />
                <Route path="/admin/transport" element={<GenericServicePage title="Public Transport" icon={Bus} endpoint="/transport/buses/" color="bg-indigo-500" />} />
                <Route path="/admin/pollution" element={<GenericServicePage title="Pollution & AQI" icon={Wind} endpoint="/pollution/readings/" color="bg-teal-500" />} />

                {/* Administration */}
                <Route path="/admin/users" element={<UsersManagement />} />
                <Route path="/admin/geography" element={<GeographyManagement />} />
                <Route path="/admin/geography/districts/:id" element={<DistrictDetails />} />
                <Route path="/admin/geography/cities/:id" element={<CityDetails />} />
                <Route path="/admin/geography/zones/:id" element={<ZoneDetails />} />
                <Route path="/admin/geography/wards/:id" element={<WardDetails />} />
                <Route path="/admin/departments" element={<DepartmentsManagement />} />

                {/* Monitoring */}
                <Route path="/admin/simulator" element={<IoTControlRoom />} />
                <Route path="/admin/analytics" element={<AdminAnalytics />} />
                <Route path="/admin/reports" element={<Reports />} />
                <Route path="/admin/audit-logs" element={<AuditLogs />} />
                <Route path="/admin/health" element={<SystemHealth />} />

                {/* Content */}
                <Route path="/admin/announcements" element={<AnnouncementsManagement />} />
                <Route path="/admin/notifications" element={<Notifications />} />

                {/* System */}
                <Route path="/admin/settings" element={<ComingSoon />} />
                <Route path="/admin/profile" element={<Profile />} />
              </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<ComingSoon />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
