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

  const navLinkStyle = ({ isActive }) => ({
    display: 'block',
    color: 'var(--sidebar-text)',
    textDecoration: 'none',
    padding: '12px 20px',
    borderRadius: 'var(--radius-md)',
    fontSize: 15,
    opacity: isActive ? 1 : 0.88,
    fontWeight: isActive ? 600 : 400,
    background: isActive ? 'var(--sidebar-active)' : 'transparent',
    margin: '0 12px',
    transition: 'background 0.15s, opacity 0.15s',
  })

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
          style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit', padding: '0 24px 24px', marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.12)' }}
        >
          {logoError ? (
            <span style={{ fontWeight: 700, fontSize: 17 }}>MAXIN Insurance</span>
          ) : (
            <>
              <img
                src="/logo.png"
                alt="MAXIN"
                onError={() => setLogoError(true)}
                style={{ height: 40, display: 'block', objectFit: 'contain' }}
              />
              <span style={{ fontWeight: 600, fontSize: 16 }}>Insurance</span>
            </>
          )}
        </NavLink>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <NavLink to="/add" style={navLinkStyle}>
            Add record
          </NavLink>
          <NavLink to="/data" style={navLinkStyle}>
            Data management
          </NavLink>
          <NavLink to="/submissions" style={navLinkStyle}>
            Version history
          </NavLink>
        </nav>
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              background: 'transparent',
              color: 'var(--sidebar-text)',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
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
