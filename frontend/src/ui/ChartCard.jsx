export default function ChartCard({ title, subtitle, right, children }) {
  return (
    <div className="card chart-card">
      <div className="chart-card__head">
        <div>
          <div className="chart-card__title">{title}</div>
          {subtitle ? <div className="chart-card__sub">{subtitle}</div> : null}
        </div>
        {right ? <div className="chart-card__right">{right}</div> : null}
      </div>
      <div className="chart-card__body">
        {children}
      </div>
    </div>
  )
}
