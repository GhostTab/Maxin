import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { getCurrentSubmission } from '../lib/submissions'
import { useAuth } from '../context/AuthContext'
import { filterDataByClientEmail } from '../lib/filterClientData'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

/** Chart colors aligned with MAXIN theme */
const CHART_COLORS = [
  '#1a365d', // maxin-dark
  '#2c5282', // maxin-accent
  '#2b6cb0', // maxin-light
  '#3182ce',
  '#4299e1',
  '#63b3ed',
  '#90cdf4',
  '#bee3f8',
]

function IconUsers({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconFileText({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function IconShield({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function IconDollar({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function parseNum(val) {
  if (val == null || val === '') return 0
  const n = parseFloat(String(val).replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, isStaff, isAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  useEffect(() => {
    let mounted = true
    getCurrentSubmission()
      .then((current) => {
        if (!mounted) return
        const raw = current?.data || { client_info: [], policy_info: [] }
        const toSet = isStaff ? raw : filterDataByClientEmail(raw, user?.email)
        setData(toSet)
      })
      .catch((err) => {
        if (!mounted) return
        setError(err.message || 'Failed to load data.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [isStaff, user?.email])

  const reports = useMemo(() => {
    const clientInfo = Array.isArray(data?.client_info) ? data.client_info : []
    const policyInfo = Array.isArray(data?.policy_info) ? data.policy_info : []

    const totalClients = clientInfo.length
    const totalPolicies = policyInfo.length

    let sumInsuredTotal = 0
    let grossPremiumTotal = 0
    const byProvider = {}
    const byStatus = {}

    policyInfo.forEach((p) => {
      sumInsuredTotal += parseNum(p.col_10)
      grossPremiumTotal += parseNum(p.col_11)
      const provider = (p.col_4 || '—').trim() || '—'
      byProvider[provider] = (byProvider[provider] || 0) + 1
      const status = (p.col_9 || '—').trim() || '—'
      byStatus[status] = (byStatus[status] || 0) + 1
    })

    const providerList = Object.entries(byProvider).sort((a, b) => b[1] - a[1])
    const statusList = Object.entries(byStatus).sort((a, b) => b[1] - a[1])

    return {
      totalClients,
      totalPolicies,
      sumInsuredTotal,
      grossPremiumTotal,
      providerList,
      statusList,
    }
  }, [data])

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-state">Loading reports…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="alert alert-error">{error}</div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-heading">Dashboard</h1>
          <p className="page-description">Summary and reports from your client and policy data.</p>
        </div>
        {isStaff && (
          <div className="dashboard-header-actions">
            <button
              type="button"
              onClick={() => navigate('/data')}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <IconFileText size={18} />
              Open Data management
            </button>
          </div>
        )}
      </div>

      <div className="card-grid dashboard-kpis">
        <div className="stat-card stat-card--kpi">
          <div className="stat-card-top">
            <span className="stat-card-icon"><IconUsers size={18} /></span>
            <span className="stat-card-label">Total clients</span>
          </div>
          <p className="stat-card-value">{reports.totalClients}</p>
        </div>
        <div className="stat-card stat-card--kpi">
          <div className="stat-card-top">
            <span className="stat-card-icon"><IconShield size={18} /></span>
            <span className="stat-card-label">Total policies</span>
          </div>
          <p className="stat-card-value">{reports.totalPolicies}</p>
        </div>
        <div className="stat-card stat-card--kpi">
          <div className="stat-card-top">
            <span className="stat-card-icon"><IconDollar size={18} /></span>
            <span className="stat-card-label">Sum insured (total)</span>
          </div>
          <p className="stat-card-value">
            {reports.sumInsuredTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="stat-card stat-card--kpi">
          <div className="stat-card-top">
            <span className="stat-card-icon"><IconDollar size={18} /></span>
            <span className="stat-card-label">Gross premium (total)</span>
          </div>
          <p className="stat-card-value">
            {reports.grossPremiumTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="card-grid dashboard-charts">
        <div className="card dashboard-chart-card">
          <div className="dashboard-card-head">
            <h3 className="card-title" style={{ margin: 0 }}>Policies by provider</h3>
            <span className="text-muted">{reports.providerList.reduce((sum, [, c]) => sum + c, 0)} total</span>
          </div>
          {reports.providerList.length === 0 ? (
            <p className="text-muted" style={{ margin: 0 }}>No policy data yet.</p>
          ) : (
            <div style={{ height: 240 }}>
              <Bar
                data={{
                  labels: reports.providerList.map(([name]) => name.length > 20 ? name.slice(0, 20) + '…' : name),
                  datasets: [{
                    label: 'Policies',
                    data: reports.providerList.map(([, count]) => count),
                    backgroundColor: reports.providerList.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        title: (items) => items.length && reports.providerList[items[0].dataIndex]
                          ? reports.providerList[items[0].dataIndex][0] : undefined,
                      },
                    },
                  },
                  scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(148, 163, 184, 0.2)' } },
                  },
                }}
              />
            </div>
          )}
        </div>
        <div className="card dashboard-chart-card">
          <div className="dashboard-card-head">
            <h3 className="card-title" style={{ margin: 0 }}>Policies by status</h3>
            <span className="text-muted">{reports.statusList.length} statuses</span>
          </div>
          {reports.statusList.length === 0 ? (
            <p className="text-muted" style={{ margin: 0 }}>No policy data yet.</p>
          ) : (
            <div style={{ height: 240 }}>
              <Doughnut
                data={{
                  labels: reports.statusList.map(([name]) => name),
                  datasets: [{
                    data: reports.statusList.map(([, count]) => count),
                    backgroundColor: reports.statusList.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
                    borderWidth: 2,
                    borderColor: '#fff',
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom' },
                  },
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
