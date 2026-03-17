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

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>
  if (!session) return <Navigate to="/login" replace />
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
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sheet" element={<Spreadsheet />} />
          <Route path="add/client" element={<AddClient />} />
          <Route path="add/policy" element={<AddPolicy />} />
          <Route path="add" element={<Navigate to="/add/client" replace />} />
          <Route path="data" element={<DataManagement />} />
          <Route path="users" element={<UserManagement />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
