import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { UnsavedProvider } from './context/UnsavedContext'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Spreadsheet from './pages/Spreadsheet'
import AddRecord from './pages/AddRecord'
import DataManagement from './pages/DataManagement'
import Layout from './components/Layout'

function ProtectedRoute({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  if (session?.user?.app_metadata?.role !== 'admin') {
    supabase.auth.signOut()
    return <Navigate to="/login" replace state={{ message: 'Admin access only. Your account cannot access this system.' }} />
  }
  return children
}

export default function App() {
  return (
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
        <Route index element={<Navigate to="/data" replace />} />
        <Route path="sheet" element={<Spreadsheet />} />
        <Route path="add" element={<AddRecord />} />
        <Route path="data" element={<DataManagement />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
