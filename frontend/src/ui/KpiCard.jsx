export default function KpiCard({ icon = 'users', label, value, hint }) {
  return (
    <div className="kpi">
      <div className="kpi__icon">{icons[icon] || icons.users}</div>
      <div className="kpi__meta">
        <div className="kpi__label">{label}</div>
        <div className="kpi__value">{value}</div>
        {hint ? <div className="kpi__hint">{hint}</div> : null}
      </div>
    </div>
  )
}

const I = (p)=> <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8" {...p}/>
const icons = {
  users:   <I><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></I>,
  calendar:<I><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></I>,
  check:   <I><path d="M20 7 10 17l-6-6"/></I>,
  trend:   <I><path d="M3 17l6-6 4 4 8-8"/><path d="M3 3v4h4"/></I>,
}
