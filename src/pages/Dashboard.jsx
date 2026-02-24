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

function parseNum(val) {
  if (val == null || val === '') return 0
  const n = parseFloat(String(val).replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  useEffect(() => {
    let mounted = true
    getCurrentSubmission()
      .then((current) => {
        if (!mounted) return
        setData(current?.data || { client_info: [], policy_info: [] })
      })
      .catch((err) => {
        if (!mounted) return
        setError(err.message || 'Failed to load data.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [])

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

  const cardStyle = {
    background: 'var(--card-bg, #fff)',
    border: '1px solid var(--border-subtle, #e8ecf1)',
    borderRadius: 'var(--radius-lg, 12px)',
    padding: 'var(--space-card, 24px)',
    boxShadow: 'var(--shadow-card)',
  }
  const statValueStyle = { fontSize: '1.75rem', fontWeight: 700, color: 'var(--maxin-dark)', margin: '0 0 4px' }
  const statLabelStyle = { fontSize: 13, color: 'var(--text-muted)', margin: 0 }

  return (
    <div className="page-content" style={{ maxWidth: 1000 }}>
      <h2 className="page-heading">Dashboard</h2>
      <p className="page-description">Summary and reports from your client and policy data.</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 20,
          marginBottom: 32,
        }}
      >
        <div style={cardStyle}>
          <p style={statValueStyle}>{reports.totalClients}</p>
          <p style={statLabelStyle}>Total clients</p>
        </div>
        <div style={cardStyle}>
          <p style={statValueStyle}>{reports.totalPolicies}</p>
          <p style={statLabelStyle}>Total policies</p>
        </div>
        <div style={cardStyle}>
          <p style={statValueStyle}>
            {reports.sumInsuredTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p style={statLabelStyle}>Sum insured (total)</p>
        </div>
        <div style={cardStyle}>
          <p style={statValueStyle}>
            {reports.grossPremiumTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p style={statLabelStyle}>Gross premium (total)</p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 24,
        }}
      >
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Policies by provider</h3>
          {reports.providerList.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>No policy data yet.</p>
          ) : (
            <div style={{ height: 280 }}>
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
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                  },
                }}
              />
            </div>
          )}
        </div>
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Policies by status</h3>
          {reports.statusList.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>No policy data yet.</p>
          ) : (
            <div style={{ height: 280 }}>
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

      <div style={{ marginTop: 32 }}>
        <button
          type="button"
          onClick={() => navigate('/data')}
          className="btn btn-primary"
        >
          Open Data management
        </button>
      </div>
    </div>
  )
}
