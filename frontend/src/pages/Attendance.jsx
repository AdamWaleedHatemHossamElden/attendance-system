import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../ui/ToastProvider.jsx'
import '../styles/attendance.css'

export default function Attendance() {
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState('')

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState({ name: '', phone: '' })

  // pagination
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Add Student modal state (full form)
  const [addOpen, setAddOpen] = useState(false)
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addForm, setAddForm] = useState({
    name: '',
    father_name: '',
    last_name: '',
    phone: '',
    address: '',
    birthdate: '',
    gender: '',
    source: '',
    graduation_year: '',
    notes: '',
    status: 'Present', // Present | Absent
  })

  // cards-only
  const [dense, setDense] = useState(false)

  // cache full student details for full-name rendering
  const [studentCache, setStudentCache] = useState({}) // id -> student

  const { push } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  // ----- helpers -----
  function fromCache(id) {
    return studentCache[String(id)] || null
  }

  function fullName(r) {
    const s = fromCache(r.student_id)
    const first  = r.name || s?.name || ''
    const father = r.father_name || s?.father_name || ''
    const last   = r.last_name || s?.last_name || ''
    const parts = [first, father, last].filter(Boolean)
    return parts.length ? parts.join(' ') : first
  }

  function initialsFrom(r) {
    const s = fromCache(r.student_id)
    const pick = (x) => (x && x.trim()[0]) || ''
    const a = pick(r.name || s?.name)
    const b = pick(r.father_name || s?.father_name)
    const c = pick(r.last_name || s?.last_name)
    const out = (a + b + c).slice(0, 2).toUpperCase()
    return out || 'ST'
  }

  function colorFor(id) {
    const n = Number(id) || 1
    const hue = (n * 47) % 360
    return {
      bg: `hsl(${hue} 90% 95%)`,
      fg: `hsl(${hue} 40% 30%)`,
      ring: `hsl(${hue} 80% 85%)`,
    }
  }

  // ----- load sessions -----
  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await api.get('/sessions')
        const list = Array.isArray(data) ? data : []
        setSessions(list)

        const param = searchParams.get('session')
        if (param && list.some(s => String(s.id) === String(param))) {
          setSessionId(String(param))
        } else if (list.length && !sessionId) {
          setSessionId(String(list[0].id))
          const sp = new URLSearchParams(searchParams)
          sp.set('session', String(list[0].id))
          setSearchParams(sp, { replace: true })
        }
      } catch {
        setSessions([])
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // keep in sync with ?session=
  useEffect(() => {
    const param = searchParams.get('session')
    if (param && param !== sessionId) {
      setSessionId(param)
      setPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // ----- load attendance -----
  async function seedAndLoad(id, targetPage = page, targetPerPage = perPage) {
    if (!id) return
    setLoading(true)
    try {
      await api.post(`/attendance/seed/${id}`) // idempotent

      const params = { page: targetPage, per_page: targetPerPage }
      if (filter.name) params.name = filter.name
      if (filter.phone) params.phone = filter.phone

      const { data } = await api.get(`/attendance/session/${id}`, { params })
      const arr = Array.isArray(data.rows) ? data.rows : []
      setRows(arr)
      setPage(data.page)
      setPerPage(data.per_page)
      setTotal(data.total)
      setTotalPages(data.total_pages)
    } catch {
      setRows([])
      push('Failed to load attendance', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionId) seedAndLoad(sessionId, 1, perPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // Hydrate missing father/last names from /students/:id and cache them
  useEffect(() => {
    async function hydrate() {
      const missing = rows.filter(
        r =>
          (!r.father_name || !r.last_name) &&
          !studentCache[String(r.student_id)]
      )
      if (missing.length === 0) return

      const updates = {}
      await Promise.all(
        missing.map(async (r) => {
          try {
            const { data } = await api.get(`/students/${r.student_id}`)
            if (data && data.id) updates[String(r.student_id)] = data
          } catch {
            /* ignore individual fetch errors */
          }
        })
      )
      if (Object.keys(updates).length) {
        setStudentCache(prev => ({ ...prev, ...updates }))
      }
    }
    if (rows.length) hydrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  // ----- interactions -----
  function onChangeSession(val) {
    setSessionId(val)
    setPage(1)
    const sp = new URLSearchParams(searchParams)
    if (val) sp.set('session', String(val))
    else sp.delete('session')
    setSearchParams(sp)
  }

  async function search() {
    if (!sessionId) return push('Select a session first', 'error')
    await seedAndLoad(sessionId, 1, perPage)
  }
  async function clearFilters() {
    setFilter({ name: '', phone: '' })
    if (sessionId) await seedAndLoad(sessionId, 1, perPage)
  }

  // Single toggle button: label shows current status; clicking flips it
  async function toggleMark(row) {
    if (!sessionId) return push('Select a session first', 'error')
    const next = (row.status || 'Absent') === 'Present' ? 'Absent' : 'Present'
    await api.post('/attendance/mark', {
      session_id: Number(sessionId),
      student_id: row.student_id,
      status: next
    })
    await seedAndLoad(sessionId, page, perPage)
    push(`Marked ${next}`, 'success')
  }

  // export
  async function exportExcel() {
    if (!sessionId) return push('Select a session first', 'error')
    try {
      const res = await api.get(`/attendance/export/session/${sessionId}`, {
        responseType: 'blob',
      })
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance-session-${sessionId}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      push('Export started', 'success')
    } catch {
      push('Failed to export Excel', 'error')
    }
  }

  // pagination
  function changePerPage(v) {
    const n = parseInt(v, 10) || 10
    setPerPage(n)
    seedAndLoad(sessionId, 1, n)
  }
  function prevPage() { if (page > 1) seedAndLoad(sessionId, page - 1, perPage) }
  function nextPage() { if (page < totalPages) seedAndLoad(sessionId, page + 1, perPage) }

  // Add Student
  function openAddModal() {
    if (!sessionId) return push('Select a session first', 'error')
    setAddForm({
      name: '',
      father_name: '',
      last_name: '',
      phone: '',
      address: '',
      birthdate: '',
      gender: '',
      source: '',
      graduation_year: '',
      notes: '',
      status: 'Present',
    })
    setAddOpen(true)
  }

  async function submitAddStudent(e) {
    e.preventDefault()
    if (!sessionId) return push('Select a session first', 'error')
    if (!addForm.name || !addForm.phone) return push('Name and Phone are required', 'error')
    setAddSubmitting(true)
    try {
      const payload = {
        name: addForm.name,
        father_name: addForm.father_name || null,
        last_name: addForm.last_name || null,
        address: addForm.address || null,
        phone: addForm.phone,
        birthdate: addForm.birthdate || null,
        gender: addForm.gender || null,
        source: addForm.source || null,
        graduation_year: addForm.graduation_year ? Number(addForm.graduation_year) : null,
        notes: addForm.notes || null,
      }
      const { data } = await api.post('/students', payload)
      const newId = data?.id
      if (!newId) return push('Student created but no ID returned', 'error')

      await api.post('/attendance/mark', {
        session_id: Number(sessionId),
        student_id: newId,
        status: addForm.status
      })

      await seedAndLoad(sessionId, page, perPage)
      setAddOpen(false)
      push(`Added ${addForm.name} and marked ${addForm.status}`, 'success')
    } catch (err) {
      const msg = err?.response?.data?.error || 'Error adding student'
      push(msg, 'error')
    } finally {
      setAddSubmitting(false)
    }
  }

  return (
    <section className="section attendance-page">
      <div className="header-row">
        <div>
          <h2 className="h2">Attendance</h2>
          <div className="kpis">
            <span className="badge kpi">Total in page: <b>{rows.length}</b></span>
            <span className="badge kpi">Per page: <b>{perPage}</b></span>
          </div>
        </div>

        <div className="actions-row">
          <label className="density">
            <input type="checkbox" checked={dense} onChange={()=>setDense(d=>!d)} />
            Compact
          </label>
          <button className="btn" onClick={exportExcel}>Export Excel</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="toolbar">
          <div>
            <label>Session</label><br/>
            <select
              className="select"
              value={sessionId}
              onChange={(e)=>onChangeSession(e.target.value)}
            >
              <option value="">(select a session)</option>
              {(Array.isArray(sessions) ? sessions : []).map(s => (
                <option key={s.id} value={s.id}>
                  {`${s.id} — ${s.title} (${new Date(s.session_date).toISOString().slice(0,10)})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Name</label><br/>
            <input className="input" placeholder="Search by name"
                   value={filter.name} onChange={e=>setFilter(f=>({...f, name:e.target.value}))}/>
          </div>
          <div>
            <label>Phone</label><br/>
            <input className="input" placeholder="Search by phone"
                   value={filter.phone} onChange={e=>setFilter(f=>({...f, phone:e.target.value}))}/>
          </div>

          <button className="btn primary" onClick={search}>Search</button>
          <button className="btn ghost" onClick={clearFilters}>Clear</button>

          <div style={{flex:1}} />
          <button className="btn success" onClick={openAddModal}>+ Add Student</button>
        </div>
      </div>

      {/* ======= Cards ======= */}
      <div className={`card cards-wrap ${dense ? 'dense' : ''}`}>
        {loading ? (
          <div className="empty-row">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="empty-row">No students</div>
        ) : (
          <div className="grid-cards">
            {rows.map((r) => {
              const c = colorFor(r.student_id)
              const init = initialsFrom(r)
              const isPresent = (r.status || 'Absent') === 'Present'
              return (
                <article key={r.student_id} className="att-card">
                  <div className="card-top">
                    <div className="avatar" style={{ background: c.bg, color: c.fg, outlineColor: c.ring }}>
                      {init}
                    </div>
                    <div className="id-badge">#{r.student_id}</div>
                  </div>

                  <h4 className="name">{fullName(r)}</h4>
                  <div className="meta">
                    <div><span className="label">Phone</span> {r.phone || '-'}</div>
                    <div>
                      <span className="label">Status</span>{' '}
                      {/* status as a single toggle button */}
                      <button
                        type="button"
                        className={`status-btn ${isPresent ? 'present' : 'absent'}`}
                        onClick={() => toggleMark(r)}
                        title="Click to toggle"
                      >
                        {isPresent ? 'Present' : 'Absent'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="card">
        <div className="toolbar" style={{justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <label>Rows per page</label><br/>
            <select className="select" value={perPage} onChange={e=>changePerPage(e.target.value)}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <button className="btn" onClick={prevPage} disabled={page <= 1}>Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button className="btn" onClick={nextPage} disabled={page >= totalPages}>Next</button>
            <span style={{marginLeft:12}}>{total} total</span>
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      {addOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="sheet-backdrop-lite"
          onClick={() => !addSubmitting && setAddOpen(false)}
        >
          <div
            className="card sheet-panel-lite"
            onClick={(e)=>e.stopPropagation()}
          >
            <h3 className="h3" style={{marginBottom:12}}>Add Student to this Session</h3>
            <form onSubmit={submitAddStudent} className="grid">
              <div className="grid-2">
                <div>
                  <label>First Name *</label><br/>
                  <input
                    className="input"
                    value={addForm.name}
                    onChange={(e)=>setAddForm(f=>({...f, name:e.target.value}))}
                    required
                  />
                </div>
                <div>
                  <label>Father Name</label><br/>
                  <input
                    className="input"
                    value={addForm.father_name}
                    onChange={(e)=>setAddForm(f=>({...f, father_name:e.target.value}))}
                  />
                </div>
                <div>
                  <label>Last Name</label><br/>
                  <input
                    className="input"
                    value={addForm.last_name}
                    onChange={(e)=>setAddForm(f=>({...f, last_name:e.target.value}))}
                  />
                </div>
                <div>
                  <label>Phone *</label><br/>
                  <input
                    className="input"
                    value={addForm.phone}
                    onChange={(e)=>setAddForm(f=>({...f, phone:e.target.value}))}
                    required
                  />
                </div>
                <div>
                  <label>Address</label><br/>
                  <input
                    className="input"
                    value={addForm.address}
                    onChange={(e)=>setAddForm(f=>({...f, address:e.target.value}))}
                  />
                </div>
                <div>
                  <label>Birthdate</label><br/>
                  <input
                    type="date"
                    className="input"
                    value={addForm.birthdate}
                    onChange={(e)=>setAddForm(f=>({...f, birthdate:e.target.value}))}
                  />
                </div>
                <div>
                  <label>Gender</label><br/>
                  <select
                    className="select"
                    value={addForm.gender}
                    onChange={(e)=>setAddForm(f=>({...f, gender:e.target.value}))}
                  >
                    <option value="">(select)</option>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
                <div>
                  <label>Source</label><br/>
                  <input
                    className="input"
                    value={addForm.source}
                    onChange={(e)=>setAddForm(f=>({...f, source:e.target.value}))}
                    placeholder="Manual / Excel / Referral / Website..."
                  />
                </div>
                <div>
                  <label>Graduation Year</label><br/>
                  <input
                    type="number"
                    className="input"
                    value={addForm.graduation_year}
                    onChange={(e)=>setAddForm(f=>({...f, graduation_year:e.target.value}))}
                    placeholder="e.g. 2026"
                  />
                </div>
                <div>
                  <label>Initial Status</label><br/>
                  <select
                    className="select"
                    value={addForm.status}
                    onChange={(e)=>setAddForm(f=>({...f, status:e.target.value}))}
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
                <div className="grid-col-span-2">
                  <label>Notes</label><br/>
                  <textarea
                    className="input"
                    rows="3"
                    value={addForm.notes}
                    onChange={(e)=>setAddForm(f=>({...f, notes:e.target.value}))}
                    placeholder="Behavior, guardians, medical notes, etc."
                  />
                </div>
              </div>

              <div style={{display:'flex', gap:8, marginTop:8}}>
                <button className="btn primary" type="submit" disabled={addSubmitting}>
                  {addSubmitting ? 'Adding…' : 'Add & Mark'}
                </button>
                <button className="btn" type="button" onClick={()=>!addSubmitting && setAddOpen(false)}>
                  Cancel
                </button>
              </div>

              <p style={{fontSize:12, color:'#666', marginTop:8}}>
                Tip: All fields can be edited later from the Students page.
              </p>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
