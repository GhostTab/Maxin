import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { UnsavedProvider } from './context/UnsavedContext'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Spreadsheet from './pages/Spreadsheet'
import AddClient from './pages/AddClient'
import AddPolicy from './pages/AddPolicy'
import DataManagement from './pages/DataManagement'
import Dashboard from './pages/Dashboard'
import Layout from './components/Layout'
import UserManagement from './pages/UserManagement'
import ClientHome from './pages/ClientHome'

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  return children
}

function IndexRedirect() {
  const { loading, session, isStaff } = useAuth()
  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={isStaff ? '/dashboard' : '/client'} replace />
}

function StaffRoute({ children }) {
  const { loading, session, isStaff } = useAuth()
  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  if (!isStaff) return <Navigate to={session ? '/client' : '/login'} replace />
  return children
}

function AdminOnlyRoute({ children }) {
  const { loading, session, canAccessUserManagement } = useAuth()
  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  if (!canAccessUserManagement) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <UnsavedProvider>
                <Layout />
              </UnsavedProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<IndexRedirect />} />

          {/* Client UI */}
          <Route path="client" element={<ClientHome />} />

          {/* Admin UI */}
          <Route
            path="dashboard"
            element={
              <StaffRoute>
                <Dashboard />
              </StaffRoute>
            }
          />
          <Route
            path="sheet"
            element={
              <StaffRoute>
                <Spreadsheet />
              </StaffRoute>
            }
          />
          <Route
            path="add/client"
            element={
              <StaffRoute>
                <AddClient />
              </StaffRoute>
            }
          />
          <Route
            path="add/policy"
            element={
              <StaffRoute>
                <AddPolicy />
              </StaffRoute>
            }
          />
          <Route
            path="add"
            element={
              <StaffRoute>
                <Navigate to="/add/client" replace />
              </StaffRoute>
            }
          />
          <Route
            path="data"
            element={
              <StaffRoute>
                <DataManagement />
              </StaffRoute>
            }
          />
          <Route
            path="users"
            element={
              <AdminOnlyRoute>
                <UserManagement />
              </AdminOnlyRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
