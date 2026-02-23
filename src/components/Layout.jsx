import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useUnsaved } from '../context/UnsavedContext'

export default function Layout() {
  const navigate = useNavigate()
  const [logoError, setLogoError] = useState(false)
  const { hasUnsavedChanges } = useUnsaved()

  async function handleLogout() {
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Save your work first, or leave anyway?\n\nClick OK to leave without saving, or Cancel to stay and save.')) {
      return
    }
    await supabase.auth.signOut()
    navigate('/login')
  }

  const navLinkClassName = ({ isActive }) =>
    `sidebar-nav-link${isActive ? ' active' : ''}`

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row' }}>
      <aside
        style={{
          width: 260,
          minWidth: 260,
          background: 'var(--sidebar-bg)',
          color: 'var(--sidebar-text)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 0',
          boxShadow: '2px 0 12px rgba(0,0,0,0.06)',
        }}
      >
        <NavLink
          to="/data"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            textDecoration: 'none',
            color: 'inherit',
            padding: '0 24px 24px',
            marginBottom: 8,
            borderBottom: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          {logoError ? (
            <span style={{ fontWeight: 700, fontSize: 17 }}>MAXIN Insurance</span>
          ) : (
            <img
              src="/Maxinlogo.png" // replace with your actual logo path if needed
              alt="MAXIN Logo"
              onError={() => setLogoError(true)}
              style={{ height: 40, display: 'block', objectFit: 'contain' }}
            />
          )}
        </NavLink>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <NavLink to="/add" className={navLinkClassName}>
            Add record
          </NavLink>
          <NavLink to="/sheet" className={navLinkClassName}>
            Spreadsheet
          </NavLink>
          <NavLink to="/data" className={navLinkClassName}>
            Data management
          </NavLink>
        </nav>
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <button
            type="button"
            onClick={handleLogout}
            className="sidebar-logout-btn"
          >
            Logout
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 32, minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  )
}