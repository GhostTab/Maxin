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
  const { loading, session, isAdmin } = useAuth()
  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={isAdmin ? '/dashboard' : '/client'} replace />
}

function AdminRoute({ children }) {
  const { loading, session, isAdmin } = useAuth()
  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/client" replace />
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
              <AdminRoute>
                <Dashboard />
              </AdminRoute>
            }
          />
          <Route
            path="sheet"
            element={
              <AdminRoute>
                <Spreadsheet />
              </AdminRoute>
            }
          />
          <Route
            path="add/client"
            element={
              <AdminRoute>
                <AddClient />
              </AdminRoute>
            }
          />
          <Route
            path="add/policy"
            element={
              <AdminRoute>
                <AddPolicy />
              </AdminRoute>
            }
          />
          <Route
            path="add"
            element={
              <AdminRoute>
                <Navigate to="/add/client" replace />
              </AdminRoute>
            }
          />
          <Route
            path="data"
            element={
              <AdminRoute>
                <DataManagement />
              </AdminRoute>
            }
          />
          <Route
            path="users"
            element={
              <AdminRoute>
                <UserManagement />
              </AdminRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
