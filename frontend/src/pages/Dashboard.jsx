import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'
import { Badge, Card, EmptyState, LoadingState, PageHeader } from '../components/ui'
import '../styles/dashboard.css'

const chartColors = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2']

export default function Dashboard() {
  const [summary, setSummary] = useState({ total_students: 0, total_sessions: 0, total_attendance: 0 })
  const [birthYearData, setBirthYearData] = useState([])
  const [gradYearData, setGradYearData] = useState([])
  const [genderData, setGenderData] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const [s, by, gy, gd, sess] = await Promise.all([
          api.get('/reports/summary'),
          api.get('/reports/students-by-birthyear'),
          api.get('/reports/students-by-graduation-year'),
          api.get('/reports/gender-distribution'),
          api.get('/sessions'),
        ])

        if (ignore) return
        setSummary(s.data || { total_students: 0, total_sessions: 0, total_attendance: 0 })
        setBirthYearData(Array.isArray(by.data) ? by.data : [])
        setGradYearData(Array.isArray(gy.data) ? gy.data : [])
        setGenderData((gd.data || []).map(r => ({ name: r.gender || 'Unknown', value: Number(r.count ?? 0) })))
        setSessions(Array.isArray(sess.data) ? sess.data : [])
      } catch (e) {
        console.error(e)
        if (!ignore) setError('Unable to load dashboard data.')
      } finally {
        if (!ignore) setLoading(false)
      }
    })()

    return () => { ignore = true }
  }, [])

  const attendanceTotals = useMemo(() => {
    let present = 0
    let absent = 0
    sessions.forEach((session) => {
      present += Number(session.present_count ?? 0)
      absent += Number(session.absent_count ?? 0)
    })
    const total = present + absent
    const rate = total ? Math.round((present / total) * 100) : 0
    return { present, absent, total, rate }
  }, [sessions])

  const trendData = useMemo(() => {
    if (!sessions.length) return []
    return [...sessions]
      .sort((a, b) => String(a.session_date || '').localeCompare(String(b.session_date || '')))
      .slice(-8)
      .map((session) => {
        const present = Number(session.present_count ?? 0)
        const absent = Number(session.absent_count ?? 0)
        const total = present + absent
        const pct = total ? Math.round((present / total) * 100) : 0
        const date = typeof session.session_date === 'string' ? session.session_date : ''
        return { name: date.slice(5, 10) || `#${session.id}`, present, absent, pct }
      })
  }, [sessions])

  const recentSessions = useMemo(() => {
    return [...sessions]
      .sort((a, b) => String(b.session_date || '').localeCompare(String(a.session_date || '')))
      .slice(0, 5)
  }, [sessions])

  if (loading) {
    return (
      <section className="dashboard-v2">
        <PageHeader
          title="Dashboard"
          description="Attendance overview across students, sessions, and recent activity."
        />
        <Card>
          <LoadingState title="Loading dashboard" text="Fetching attendance and student summaries." />
        </Card>
      </section>
    )
  }

  return (
    <section className="dashboard-v2">
      <PageHeader
        eyebrow="Attendance System V2"
        title="Dashboard"
        description="A focused overview of enrollment, session activity, and attendance health."
        actions={
          <div className="dashboard-v2__actions">
            <Link to="/sessions" className="v2-button">View sessions</Link>
            <Link to="/students" className="v2-button v2-button--primary">Manage students</Link>
          </div>
        }
      />

      {error ? (
        <Card>
          <EmptyState title="Dashboard unavailable" text={error} />
        </Card>
      ) : null}

      <div className="dashboard-v2__hero">
        <Card className="dashboard-v2__health-card">
          <div className="dashboard-v2__health-top">
            <div>
              <p className="dashboard-v2__label">Attendance rate</p>
              <div className="dashboard-v2__rate">{attendanceTotals.rate}%</div>
            </div>
            <Badge variant={attendanceTotals.rate >= 75 ? 'success' : attendanceTotals.rate > 0 ? 'warning' : 'default'}>
              {attendanceTotals.total ? `${formatNumber(attendanceTotals.total)} marks` : 'No marks yet'}
            </Badge>
          </div>
          <div className="dashboard-v2__meter" aria-hidden="true">
            <span style={{ width: `${attendanceTotals.rate}%` }} />
          </div>
          <div className="dashboard-v2__split">
            <span><b>{formatNumber(attendanceTotals.present)}</b> present</span>
            <span><b>{formatNumber(attendanceTotals.absent)}</b> absent</span>
          </div>
        </Card>

        <div className="dashboard-v2__stats">
          <StatCard label="Total students" value={summary.total_students} tone="blue" />
          <StatCard label="Total sessions" value={summary.total_sessions} tone="green" />
          <StatCard label="Attendance records" value={summary.total_attendance} tone="purple" />
          <StatCard label="Present count" value={attendanceTotals.present} tone="success" />
          <StatCard label="Absent count" value={attendanceTotals.absent} tone="danger" />
        </div>
      </div>

      <div className="dashboard-v2__grid dashboard-v2__grid--wide">
        <DashboardChart
          title="Attendance trend"
          subtitle="Last 8 sessions by present, absent, and rate"
          empty={!trendData.length}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="var(--text-muted)" />
              <YAxis yAxisId="left" allowDecimals={false} stroke="var(--text-muted)" />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={value => `${value}%`} stroke="var(--text-muted)" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="present" name="Present" fill="var(--status-success)" />
              <Bar yAxisId="left" dataKey="absent" name="Absent" fill="var(--status-danger)" />
              <Line yAxisId="right" type="monotone" dataKey="pct" name="Present %" stroke="var(--brand)" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </DashboardChart>

        <Card className="dashboard-v2__recent">
          <div className="dashboard-v2__section-head">
            <div>
              <h3>Recent sessions</h3>
              <p>Latest sessions from the active database</p>
            </div>
            <Badge>{recentSessions.length} shown</Badge>
          </div>
          {recentSessions.length ? (
            <div className="dashboard-v2__session-list">
              {recentSessions.map((session) => {
                const present = Number(session.present_count ?? 0)
                const absent = Number(session.absent_count ?? 0)
                const total = present + absent
                const pct = total ? Math.round((present / total) * 100) : 0
                return (
                  <Link key={session.id} to={`/attendance?session=${session.id}`} className="dashboard-v2__session-row">
                    <span>
                      <b>{session.title}</b>
                      <small>{formatDateOnly(session.session_date)}</small>
                    </span>
                    <Badge variant={pct >= 75 ? 'success' : total ? 'warning' : 'default'}>{pct}%</Badge>
                  </Link>
                )
              })}
            </div>
          ) : (
            <EmptyState title="No sessions yet" text="Create sessions to begin tracking attendance." />
          )}
        </Card>
      </div>

      <div className="dashboard-v2__grid">
        <DashboardChart title="Students by gender" empty={!genderData.length}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={genderData} dataKey="value" nameKey="name" outerRadius={104} label>
                {genderData.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </DashboardChart>

        <DashboardChart title="Students by birth year" empty={!birthYearData.length}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={birthYearData}>
              <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <XAxis dataKey="birth_year" stroke="var(--text-muted)" />
              <YAxis allowDecimals={false} stroke="var(--text-muted)" />
              <Tooltip />
              <Bar dataKey="count" fill="var(--brand)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </DashboardChart>

        <DashboardChart title="Students by graduation year" empty={!gradYearData.length}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gradYearData}>
              <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <XAxis dataKey="graduation_year" stroke="var(--text-muted)" />
              <YAxis allowDecimals={false} stroke="var(--text-muted)" />
              <Tooltip />
              <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </DashboardChart>
      </div>
    </section>
  )
}

function StatCard({ label, value, tone }) {
  return (
    <Card className={`dashboard-v2__stat dashboard-v2__stat--${tone}`}>
      <p>{label}</p>
      <strong>{formatNumber(value)}</strong>
    </Card>
  )
}

function DashboardChart({ title, subtitle, empty, children }) {
  return (
    <Card className="dashboard-v2__chart">
      <div className="dashboard-v2__section-head">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="dashboard-v2__chart-body">
        {empty ? <EmptyState title="No chart data" text="Data will appear here once records are available." /> : children}
      </div>
    </Card>
  )
}

function formatNumber(value) {
  const numeric = Number(value ?? 0)
  return Number.isFinite(numeric) ? numeric.toLocaleString() : '0'
}

function formatDateOnly(value) {
  return typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : ''
}
