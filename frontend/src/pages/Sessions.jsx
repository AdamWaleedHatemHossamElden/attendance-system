import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../ui/ToastProvider.jsx'
import Confirm from '../ui/Confirm.jsx'

export default function Sessions() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  // Add form
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate]   = useState('') // yyyy-mm-dd

  // Search form
  const [filter, setFilter] = useState({ title: '' })

  // Edit state
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDate,  setEditDate]  = useState('')

  // Confirm modal state
  const [confirm, setConfirm] = useState({ open: false, id: null, message: '' })

  const { push } = useToast()

  async function load() {
    setLoading(true)
    try {
      const params = {}
      if (filter.title) params.title = filter.title
      const { data } = await api.get('/sessions', { params })

      // Coerce numeric counts immediately to avoid string math/concat
      const normalized = (Array.isArray(data) ? data : []).map(r => ({
        ...r,
        present_count: Number(r.present_count ?? 0),
        absent_count: Number(r.absent_count ?? 0),
      }))

      setRows(normalized)
    } catch (err) {
      console.error(err)
      push('Failed to load sessions', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ---- Add ----
  async function onAdd(e) {
    e.preventDefault()
    if (!newTitle.trim() || !newDate) return push('Title and Date are required', 'error')
    try {
      await api.post('/sessions', { title: newTitle.trim(), session_date: newDate })
      setNewTitle('')
      setNewDate('')
      await load()
      push('Session added', 'success')
    } catch (err) {
      console.error(err)
      push('Failed to add session', 'error')
    }
  }

  // ---- Edit ----
  function startEdit(r) {
    setEditingId(r.id)
    setEditTitle(r.title || '')
    const d = r.session_date ? new Date(r.session_date) : null
    const ymd = d ? d.toISOString().slice(0,10) : ''
    setEditDate(ymd)
  }
  function cancelEdit() {
    setEditingId(null)
    setEditTitle('')
    setEditDate('')
  }
  async function saveEdit(id) {
    if (!editTitle.trim() || !editDate) return push('Title and Date are required', 'error')
    try {
      await api.put(`/sessions/${id}`, { title: editTitle.trim(), session_date: editDate })
      cancelEdit()
      await load()
      push('Session saved', 'success')
    } catch (err) {
      console.error(err)
      push('Failed to save session', 'error')
    }
  }

  // ---- Delete (use real numeric counts) ----
  function askDelete(sessionRow) {
    const p = Number(sessionRow.present_count ?? 0)
    const a = Number(sessionRow.absent_count ?? 0)
    const msg = `This session has ${p} “Present” and ${a} “Absent” records.

If you delete this session, its entire attendance will be deleted too. This action cannot be undone.`
    setConfirm({ open: true, id: sessionRow.id, message: msg })
  }

  async function doDelete() {
    const id = confirm.id
    setConfirm({ open: false, id: null, message: '' })
    try {
      await api.delete(`/sessions/${id}`)
      await load()
      push('Session deleted', 'success')
    } catch (err) {
      console.error(err)
      push('Failed to delete session', 'error')
    }
  }

  // ---- Search ----
  function clearFilter() {
    setFilter({ title: '' })
    load()
  }

  return (
    <section className="section">
      <h2 className="h2">Sessions</h2>

      {/* Add session */}
      <div className="card">
        <form onSubmit={onAdd} className="toolbar">
          <div>
            <label>Title *</label><br/>
            <input
              className="input"
              placeholder="Session title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
          </div>
          <div>
            <label>Date *</label><br/>
            <input
              type="date"
              className="input"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
            />
          </div>
          <button className="btn primary" type="submit">Add Session</button>
        </form>
      </div>

      {/* Search */}
      <div className="card">
        <form className="toolbar" onSubmit={(e)=>{ e.preventDefault(); load(); }}>
          <div>
            <label>Title</label><br/>
            <input
              className="input"
              placeholder="Search by title"
              value={filter.title}
              onChange={e => setFilter(f => ({ ...f, title: e.target.value }))}
            />
          </div>
          <button className="btn primary" type="submit">Search</button>
          <button className="btn ghost" type="button" onClick={clearFilter}>Clear</button>
        </form>
      </div>

      {/* List */}
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Date</th>
              <th>Present</th>
              <th>Absent</th>
              <th>Total</th>
              <th>Attendance %</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan="8">No sessions</td></tr>
            ) : (
              rows.map(r => {
                const isEdit = editingId === r.id
                const dateText = r.session_date
                  ? new Date(r.session_date).toISOString().slice(0,10)
                  : ''
                const present = Number(r.present_count ?? 0)
                const absent  = Number(r.absent_count ?? 0)
                const total   = present + absent
                const percent = total ? Math.round((present / total) * 100) : 0

                return (
                  <tr key={r.id}>
                    <td>{r.id}</td>

                    <td>
                      {isEdit ? (
                        <input
                          className="input"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                        />
                      ) : r.title}
                    </td>

                    <td>
                      {isEdit ? (
                        <input
                          type="date"
                          className="input"
                          value={editDate}
                          onChange={e => setEditDate(e.target.value)}
                        />
                      ) : dateText}
                    </td>

                    <td>{present}</td>
                    <td>{absent}</td>
                    <td>{total}</td>
                    <td>{percent}%</td>

                    <td style={{display:'flex', gap:8}}>
                      <Link to={`/attendance?session=${r.id}`} className="btn">Attendance</Link>

                      {isEdit ? (
                        <>
                          <button className="btn success" type="button" onClick={() => saveEdit(r.id)}>Save</button>
                          <button className="btn" type="button" onClick={cancelEdit}>Cancel</button>
                        </>
                      ) : (
                        <button className="btn" type="button" onClick={() => startEdit(r)}>Edit</button>
                      )}

                      <button className="btn danger" type="button" onClick={() => askDelete(r)}>Delete</button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation modal */}
      <Confirm
        open={confirm.open}
        title="Delete session?"
        message={confirm.message || "Deleting this session will remove all its attendance. This action cannot be undone."}
        onCancel={() => setConfirm({ open: false, id: null, message: '' })}
        onConfirm={doDelete}
      />
    </section>
  )
}
