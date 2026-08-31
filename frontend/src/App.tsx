import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './components/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'

import CitizenLayout from './layouts/CitizenLayout'
import CitizenHome from './pages/citizen/CitizenHome'
import CitizenMap from './pages/citizen/CitizenMap'
import ReportIncident from './pages/citizen/ReportIncident'
import IncidentHistory from './pages/citizen/IncidentHistory'
import CitizenProfile from './pages/citizen/CitizenProfile'
import SOSPage from './pages/citizen/SOSPage'

import AdminLayout from './layouts/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import GISMap from './pages/admin/GISMap'
import IncidentsPage from './pages/admin/IncidentsPage'
import AlertsPage from './pages/admin/AlertsPage'
import TaskForcesPage from './pages/admin/TaskForcesPage'
import SOSManagementPage from './pages/admin/SOSManagementPage'
import RoadsPage from './pages/admin/RoadsPage'
import InfrastructurePage from './pages/admin/InfrastructurePage'
import AnalyticsPage from './pages/admin/AnalyticsPage'
import AssistantPage from './pages/admin/AssistantPage'
import SettingsPage from './pages/admin/SettingsPage'

const ADMIN_ROLES = ['DISTRICT_ADMIN', 'STATE_ADMIN', 'CENTRAL_ADMIN'] as const

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const target = (ADMIN_ROLES as readonly string[]).includes(user.role) ? '/admin' : '/citizen'
  return <Navigate to={target} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/citizen"
          element={
            <ProtectedRoute allow={['CITIZEN']}>
              <CitizenLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<CitizenHome />} />
          <Route path="map" element={<CitizenMap />} />
          <Route path="report" element={<ReportIncident />} />
          <Route path="history" element={<IncidentHistory />} />
          <Route path="profile" element={<CitizenProfile />} />
          <Route path="sos" element={<SOSPage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute allow={[...ADMIN_ROLES]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="map" element={<GISMap />} />
          <Route path="incidents" element={<IncidentsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="sos" element={<SOSManagementPage />} />
          <Route path="taskforces" element={<TaskForcesPage />} />
          <Route path="roads" element={<RoadsPage />} />
          <Route path="infrastructure" element={<InfrastructurePage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </AuthProvider>
  )
}
