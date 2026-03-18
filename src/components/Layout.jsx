import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useUnsaved } from '../context/UnsavedContext'
import logo from '../assets/Maxin logo.png'

const iconDashboard = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
)
const iconAddClient = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </svg>
)
const iconAddPolicy = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)
const iconCardTable = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </svg>
)
const iconData = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
)
const iconUsers = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const iconLogout = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

export default function Layout() {
  const navigate = useNavigate()
  const [logoError, setLogoError] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isAdmin } = useAuth()
  const { hasUnsavedChanges } = useUnsaved()

  async function handleLogout() {
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Save your work first, or leave anyway?\n\nClick OK to leave without saving, or Cancel to stay and save.')) {
      return
    }
    if (supabase) await supabase.auth.signOut()
    navigate('/login')
  }

  const navLinkClassName = ({ isActive }) =>
    `sidebar-nav-link${isActive ? ' active' : ''}`

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`app-sidebar ${sidebarOpen ? 'is-open' : ''}`}
        aria-label="App navigation"
      >
        <NavLink
          to="/dashboard"
          className="sidebar-logo-link"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            color: 'inherit',
            padding: '0 16px 24px',
            marginBottom: 8,
            borderBottom: '1px solid var(--border)',
          }}
          onClick={() => setSidebarOpen(false)}
        >
          {logoError ? (
            <svg
              className="sidebar-logo-svg"
              viewBox="0 0 120 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="MAXIN Insurance"
            >
              <text x="0" y="26" fill="var(--text-primary)" fontSize="22" fontWeight="700" letterSpacing="0.08em" fontFamily="inherit">MAXIN</text>
            </svg>
          ) : (
            <img
              src={logo}
              alt="MAXIN Insurance"
              onError={() => setLogoError(true)}
              className="sidebar-logo-img"
            />
          )}
        </NavLink>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }} aria-label="Main">
          <NavLink to="/dashboard" className={navLinkClassName} onClick={() => setSidebarOpen(false)}>
            {iconDashboard}
            <span>Dashboard</span>
          </NavLink>
          {isAdmin && (
            <>
              <NavLink to="/add/client" className={navLinkClassName} onClick={() => setSidebarOpen(false)}>
                {iconAddClient}
                <span>Add client</span>
              </NavLink>
              <NavLink to="/add/policy" className={navLinkClassName} onClick={() => setSidebarOpen(false)}>
                {iconAddPolicy}
                <span>Add policy</span>
              </NavLink>
            </>
          )}
          <NavLink to="/sheet" className={navLinkClassName} onClick={() => setSidebarOpen(false)}>
            {iconCardTable}
            <span>Spreadsheet</span>
          </NavLink>
          {isAdmin && (
            <NavLink to="/data" className={navLinkClassName} onClick={() => setSidebarOpen(false)}>
              {iconData}
              <span>Data management</span>
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/users" className={navLinkClassName} onClick={() => setSidebarOpen(false)}>
              {iconUsers}
              <span>User management</span>
            </NavLink>
          )}
        </nav>
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={handleLogout}
            className="sidebar-logout-btn"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}
          >
            {iconLogout}
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="app-main">
        {/* Mobile topbar */}
        <div className="mobile-topbar">
          <button
            type="button"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            Menu
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
