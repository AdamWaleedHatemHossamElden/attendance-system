import { useEffect, useState } from 'react'
import { api } from '../api'
import '../styles/reports.css'

export default function Reports() {
  const [present, setPresent]   = useState('')
  const [absent, setAbsent]     = useState('')

  const [busy, setBusy]         = useState(false)
  const [err, setErr]           = useState('')

  const [rows, setRows]         = useState([])
  const [meta, setMeta]         = useState({ present: 0, absent: 0 })

  // pagination (same pattern as other pages)
  const [page, setPage]         = useState(1)
  const [perPage, setPerPage]   = useState(10)
  const [total, setTotal]       = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  async function fetchPage(targetPage = page, targetPer = perPage) {
    setErr('')
    const p = parseInt(present, 10)
    const a = parseInt(absent, 10)
    if ([p, a].some(n => Number.isNaN(n) || n < 0)) {
      setErr('Enter non-negative numbers for Present and Absent')
      return
    }
    setBusy(true)
    try {
      const { data } = await api.get('/reports/students-by-count', {
        params: { present: p, absent: a, page: targetPage, per_page: targetPer }
      })
      setRows(data.rows || [])
      setMeta({ present: data.present, absent: data.absent })
      setPage(data.page || targetPage)
      setPerPage(data.per_page || targetPer)
      setTotal(data.total || 0)
      setTotalPages(data.total_pages || 1)
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to fetch report')
      setRows([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setBusy(false)
    }
  }

  function onSearch(e) {
    e?.preventDefault?.()
    // reset to page 1 when (re)searching
    fetchPage(1, perPage)
  }

  function changePerPage(v) {
    const n = parseInt(v, 10) || 10
    setPerPage(n)
    fetchPage(1, n) // go back to first page on size change
  }
  function prevPage() {
    if (page > 1) fetchPage(page - 1, perPage)
  }
  function nextPage() {
    if (page < totalPages) fetchPage(page + 1, perPage)
  }

  function exportCSV() {
    if (!rows.length) return
    const headers = ['ID','Name','Phone','Present','Absent','Total','Attendance%']
    const lines = rows.map(r => [
      r.id, csv(r.name), csv(r.phone), r.present_count, r.absent_count, r.total, r.percent_present
    ].join(','))
    const csvText = [headers.join(','), ...lines].join('\n')
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `students-present-${meta.present}-absent-${meta.absent}-page-${page}.csv`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }
  const csv = (v) => {
    if (v == null) return ''
    const s = String(v)
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s
  }

  return (
    <section className="section">
      <h2 className="h2">Reports</h2>

      <div className="reports-grid">
        {/* Left: Query Panel */}
        <div className="panel">
          <div className="panel__frame">
            <div className="panel__badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" strokeWidth="1.8">
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M3 3v4h4" />
              </svg>
            </div>

            <h3 className="panel__title">Find Students by Exact Counts</h3>
            <p className="panel__sub">Show students whose <b>Present</b> and <b>Absent</b> totals match exactly.</p>

            {err && <div className="alert error" style={{marginBottom:10}}>{err}</div>}

            <form onSubmit={onSearch} className="rep-form">
              <div>
                <label>Present</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={present}
                  onChange={e => setPresent(e.target.value)}
                  placeholder="e.g. 0"
                />
              </div>
              <div>
                <label>Absent</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={absent}
                  onChange={e => setAbsent(e.target.value)}
                  placeholder="e.g. 11"
                />
              </div>
              <button className="btn primary" type="submit" disabled={busy}>
                {busy ? 'Searching…' : 'Search'}
              </button>
            </form>
          </div>
        </div>

        {/* Right: Results Panel */}
        <div className="panel">
          <div className="panel__frame">
            <div className="panel__badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" strokeWidth="1.8">
                <path d="M8 21h8" /><path d="M12 17v4" />
                <rect x="3" y="3" width="18" height="14" rx="2" />
                <path d="M7 7h10" /><path d="M7 11h6" />
              </svg>
            </div>

            <div className="rep-head">
              <h3 className="panel__title">Results</h3>
              <div className="rep-meta">
                <span className="badge">{`Present ${meta.present}`}</span>
                <span className="badge">{`Absent ${meta.absent}`}</span>
                <span className="badge">{`${total} total`}</span>
                <button className="btn" onClick={exportCSV} disabled={!rows.length}>Export CSV</button>
              </div>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{textAlign:'left'}}>ID</th>
                    <th style={{textAlign:'left'}}>Name</th>
                    <th style={{textAlign:'left'}}>Phone</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Total</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? rows.map(r => {
                    const pct = r.percent_present ?? (r.total ? Math.round((r.present_count/r.total)*100) : 0)
                    return (
                      <tr key={r.id}>
                        <td>{r.id}</td>
                        <td>{r.name}</td>
                        <td>{r.phone}</td>
                        <td>{r.present_count}</td>
                        <td>{r.absent_count}</td>
                        <td>{r.total}</td>
                        <td>{pct}%</td>
                      </tr>
                    )
                  }) : (
                    <tr><td colSpan="7" style={{textAlign:'center', padding:12}}>
                      {busy ? 'Loading…' : 'No results'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls (same UX as other pages) */}
            <div className="rep-pagination">
              <div>
                <label>Rows per page</label><br/>
                <select className="select" value={perPage} onChange={e=>changePerPage(e.target.value)}>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="rep-page-ctrl">
                <button className="btn" onClick={prevPage} disabled={page <= 1}>Prev</button>
                <span>Page {page} of {totalPages}</span>
                <button className="btn" onClick={nextPage} disabled={page >= totalPages}>Next</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
