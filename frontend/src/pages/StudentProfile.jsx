import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";

function toDateOnly(v) {
  if (!v) return "";
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    return new Date(v).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function StudentProfile() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // NEW: status filter
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'Present' | 'Absent'

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const [sRes, sessRes] = await Promise.all([
          api.get(`/students/${id}`),
          api.get(`/students/${id}/sessions`),
        ]);
        if (!ignore) {
          setStudent(sRes.data);
          setSessions(sessRes.data || []);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [id]);

  // Apply filter in-memory (frontend only)
  const filteredSessions = useMemo(() => {
    if (statusFilter === "all") return sessions;
    return (sessions || []).filter(r => r.status === statusFilter);
  }, [sessions, statusFilter]);

  if (loading) return <section className="section"><div className="card">Loading…</div></section>;
  if (!student) return <section className="section"><div className="card">Student not found</div></section>;

  return (
    <section className="section">
      <div className="toolbar" style={{marginBottom:16}}>
        <Link to="/students" className="btn">← Back to Students</Link>
      </div>

      {/* Details (Student ID hidden as requested) */}
      <div className="card">
        <h2 className="h2" style={{marginBottom:12}}>Student Profile</h2>
        <div className="grid-2">
          {/* <Field label="ID" value={student.id} />  — hidden */}
          <Field label="First name" value={student.name || ""} />
          <Field label="Father name" value={student.father_name || ""} />
          <Field label="Last name" value={student.last_name || ""} />
          <Field label="Phone" value={student.phone || ""} />
          <Field label="Address" value={student.address || ""} />
          <Field label="Birthdate" value={toDateOnly(student.birthdate)} />
          <Field label="Gender" value={student.gender || ""} />
          <Field label="Source" value={student.source || ""} />
          <Field label="Graduation year" value={student.graduation_year || ""} />
          <Field label="Entered system" value={student.created_at ? new Date(student.created_at).toLocaleString() : ""} />
          <Field label="Present count" value={student.present_count ?? 0} />
          <Field label="Absent count" value={student.absent_count ?? 0} />
          <div className="grid-col-span-2">
            <label style={{display:"block", fontSize:12, color:"#666", marginBottom:6}}>Notes</label>
            <div style={{whiteSpace:"pre-wrap"}}>{student.notes || "—"}</div>
          </div>
        </div>
      </div>

      {/* Sessions & Attendance */}
      <div className="card table-wrap">
        <div className="toolbar" style={{marginBottom:8, alignItems:"end", gap:12}}>
          <h3 className="h3" style={{margin:0}}>Sessions & Attendance</h3>
          <div style={{marginLeft:"auto"}}>
            <label style={{display:"block", fontSize:12, color:"#666", marginBottom:6}}>
              Filter by status
            </label>
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{minWidth:160}}
            >
              <option value="all">All Sessions</option>
              <option value="Present">Present Only</option>
              <option value="Absent">Absent Only</option>
            </select>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              {/* Session ID hidden as requested */}
              {/* <th>Session ID</th> */}
              <th>Title</th>
              <th>Date</th>
              <th>Status</th>
              <th>Marked At</th>
            </tr>
          </thead>
          <tbody>
            {filteredSessions.length === 0 ? (
              <tr><td colSpan="4">No sessions match this filter</td></tr>
            ) : filteredSessions.map((r, i) => (
              <tr key={i}>
                {/* <td>{r.session_id}</td> */}
                <td>{r.title}</td>
                <td>{toDateOnly(r.session_date)}</td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
                <td>{r.marked_at ? new Date(r.marked_at).toLocaleString() : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <label style={{display:"block", fontSize:12, color:"#666", marginBottom:6}}>{label}</label>
      <div>{value || "—"}</div>
    </div>
  );
}

// Small UI helper to highlight status (optional but nice)
function StatusBadge({ status }) {
  const isPresent = status === "Present";
  const style = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 12,
    border: "1px solid",
    borderColor: isPresent ? "#22c55e55" : "#ef444455",
    background: isPresent ? "#22c55e22" : "#ef444422",
  };
  return <span style={style}>{status}</span>;
}
