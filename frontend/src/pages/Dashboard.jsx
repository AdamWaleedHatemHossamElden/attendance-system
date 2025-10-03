import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'

// wrappers + styles
import KpiCard from '../ui/KpiCard.jsx'
import ChartCard from '../ui/ChartCard.jsx'
import '../styles/dashboard.css'

export default function Dashboard() {
  const [summary, setSummary] = useState({ total_students: 0, total_sessions: 0, total_attendance: 0 })
  const [birthYearData, setBirthYearData] = useState([])
  const [gradYearData, setGradYearData] = useState([])
  const [genderData, setGenderData] = useState([])

  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const [s, by, gy, gd] = await Promise.all([
          api.get('/reports/summary'),
          api.get('/reports/students-by-birthyear'),
          api.get('/reports/students-by-graduation-year'),
          api.get('/reports/gender-distribution'),
        ])
        setSummary(s.data)
        setBirthYearData(by.data)
        setGradYearData(gy.data)
        setGenderData((gd.data || []).map(r => ({ name: r.gender, value: Number(r.count) })))

        const sess = await api.get('/sessions')
        setSessions(Array.isArray(sess.data) ? sess.data : [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const colors = ['#59a14f', '#e15759', '#f28e2b', '#76b7b2', '#edc949', '#af7aa1', '#ff9da7']

  const avgAttendancePct = useMemo(() => {
    if (!sessions?.length) return null
    let p = 0, a = 0
    sessions.forEach(s => { p += Number(s.present_count ?? 0); a += Number(s.absent_count ?? 0) })
    const t = p + a
    return t ? Math.round((p / t) * 100) : null
  }, [sessions])

  const trendData = useMemo(() => {
    if (!sessions?.length) return []
    const sorted = [...sessions].sort((x, y) => new Date(x.session_date) - new Date(y.session_date))
    return sorted.slice(-8).map(s => {
      const present = Number(s.present_count ?? 0)
      const absent  = Number(s.absent_count ?? 0)
      const total   = present + absent
      const pct     = total ? Math.round((present / total) * 100) : 0
      return { name: new Date(s.session_date).toISOString().slice(5,10), present, absent, pct }
    })
  }, [sessions])

  const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : n)

  return (
    <section className="section">
      <div className="dash-header">
        <h2 className="h2">Dashboard</h2>
        <div className="chip">All data</div>
      </div>

      <div className="kpis">
        <KpiCard icon="users"    label="Students"           value={fmt(summary.total_students)} />
        <KpiCard icon="calendar" label="Sessions"           value={fmt(summary.total_sessions)} />
        <KpiCard icon="check"    label="Attendance Records" value={fmt(summary.total_attendance)} />
        {avgAttendancePct !== null && (
          <KpiCard icon="trend" label="Avg Attendance" value={`${avgAttendancePct}%`} />
        )}
      </div>

      <div className="charts-row charts-two">
        <ChartCard title="Attendance Trend (last sessions)" subtitle="Present % and counts">
          <div style={{ width:'100%', height:320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid stroke="#e6e6ee" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#374151" />
                <YAxis yAxisId="left" allowDecimals={false} stroke="#374151" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={v=>`${v}%`} stroke="#374151" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="present" name="Present" fill="#4e79a7" />
                <Bar yAxisId="left" dataKey="absent"  name="Absent"  fill="#e15759" />
                <Line yAxisId="right" type="monotone" dataKey="pct" name="Present %" stroke="#2563eb" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Students by Gender">
          <div style={{ width:'100%', height:320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={genderData} dataKey="value" nameKey="name" outerRadius={110} label>
                  {genderData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="charts-row charts-two">
        <ChartCard title="Students by Birth Year">
          <div style={{ width:'100%', height:320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={birthYearData}>
                <CartesianGrid stroke="#e6e6ee" strokeDasharray="3 3" />
                <XAxis dataKey="birth_year" stroke="#374151" />
                <YAxis allowDecimals={false} stroke="#374151" />
                <Tooltip />
                <Bar dataKey="count" fill="#4e79a7" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Students by Graduation Year">
          <div style={{ width:'100%', height:320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradYearData}>
                <CartesianGrid stroke="#e6e6ee" strokeDasharray="3 3" />
                <XAxis dataKey="graduation_year" stroke="#374151" />
                <YAxis allowDecimals={false} stroke="#374151" />
                <Tooltip />
                <Bar dataKey="count" fill="#6b8fd6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </section>
  )
}
