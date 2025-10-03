import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Confirm from "../ui/Confirm.jsx";
import { useToast } from "../ui/ToastProvider.jsx";
import NoteModal from "../ui/NoteModal.jsx";
import { useNavigate } from "react-router-dom";
import SideSheet from "../ui/SideSheet.jsx";
import "../styles/students.css";

/* ----------------------------- Utilities ----------------------------- */
function truncate(txt, n = 80) {
  if (!txt) return "";
  return txt.length > n ? txt.slice(0, n) + "…" : txt;
}
function toDateOnly(v) {
  if (!v) return null;
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    return new Date(v).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}
function initials(name = "", father = "", last = "") {
  const pick = (s) => (s && s.trim()[0]) || "";
  return (pick(name) + pick(father) + pick(last)).slice(0, 2).toUpperCase() || "ST";
}
function colorFor(id) {
  const hue = (Number(id) * 47) % 360;
  return {
    bg: `hsl(${hue} 90% 95%)`,
    fg: `hsl(${hue} 40% 35%)`,
    ring: `hsl(${hue} 80% 85%)`,
  };
}

/* ================================ Page ================================ */
export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filter, setFilter] = useState({
    name: "", phone: "", gender: "", graduation_year: "", sort: "id_desc",
  });

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12); // cards default
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [form, setForm] = useState({
    name: "", father_name: "", last_name: "", address: "", phone: "",
    birthdate: "", gender: "", source: "", graduation_year: "", notes: "",
  });

  // Edit state (used by sheet)
  const [editId, setEditId] = useState(null);
  const [editRow, setEditRow] = useState({
    name: "", father_name: "", last_name: "", address: "", phone: "",
    birthdate: "", gender: "", source: "", graduation_year: "", notes: "",
  });

  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteStudent, setNoteStudent] = useState(null);

  const { push } = useToast();
  const [confirm, setConfirm] = useState({ open: false, id: null, message: "" });

  const navigate = useNavigate();

  // UI toggles
  const [dense, setDense] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // "More" dropdown (click-to-toggle)
  const [menuOpen, setMenuOpen] = useState(false);
  const splitRef = useRef(null);
  useEffect(() => {
    function onDocDown(e) {
      if (!splitRef.current) return;
      if (!splitRef.current.contains(e.target)) setMenuOpen(false);
    }
    function onEsc(e) { if (e.key === "Escape") setMenuOpen(false); }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  async function load(targetPage = page, targetPerPage = perPage) {
    setLoading(true);
    try {
      const params = {
        page: targetPage,
        per_page: targetPerPage,
        sort: filter.sort || "id_desc",
      };
      if (filter.name) params.name = filter.name;
      if (filter.phone) params.phone = filter.phone;
      if (filter.gender) params.gender = filter.gender;
      if (filter.graduation_year) params.graduation_year = filter.graduation_year;

      const { data } = await api.get("/students", { params });
      setStudents(data.rows || []);
      setPage(data.page);
      setPerPage(data.per_page);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(1, perPage); /* eslint-disable-next-line */ }, []);

  /* ------------------------------- CRUD ------------------------------- */
  async function onAddSubmit(e) {
    e?.preventDefault?.();
    if (!form.name || !form.phone) return push("First name and Phone are required", "error");
    const payload = {
      name: form.name,
      father_name: form.father_name || null,
      last_name: form.last_name || null,
      address: form.address || null,
      phone: form.phone,
      birthdate: toDateOnly(form.birthdate),
      gender: form.gender || null,
      source: form.source || null,
      graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
      notes: form.notes || null,
    };
    try {
      await api.post("/students", payload);
      setForm({
        name: "", father_name: "", last_name: "", address: "", phone: "",
        birthdate: "", gender: "", source: "", graduation_year: "", notes: "",
      });
      await load(1, perPage);
      setAddOpen(false);
      push("Student added", "success");
    } catch (err) {
      const server = err?.response?.data;
      push((server && (server.error || server.message)) || "Error adding student", "error");
    }
  }

  function startEdit(s) {
    setEditId(s.id);
    setEditRow({
      name: s.name || "",
      father_name: s.father_name || "",
      last_name: s.last_name || "",
      address: s.address || "",
      phone: s.phone || "",
      birthdate: s.birthdate ? toDateOnly(s.birthdate) : "",
      gender: s.gender || "",
      source: s.source || "",
      graduation_year: s.graduation_year || "",
      notes: s.notes || "",
    });
  }
  function cancelEdit() {
    setEditId(null);
    setEditRow({
      name: "", father_name: "", last_name: "", address: "", phone: "",
      birthdate: "", gender: "", source: "", graduation_year: "", notes: "",
    });
  }
  async function saveEdit(id) {
    try {
      await api.put(`/students/${id}`, {
        name: editRow.name,
        father_name: editRow.father_name || null,
        last_name: editRow.last_name || null,
        address: editRow.address || null,
        phone: editRow.phone,
        birthdate: toDateOnly(editRow.birthdate),
        gender: editRow.gender || null,
        source: editRow.source || null,
        graduation_year: editRow.graduation_year ? Number(editRow.graduation_year) : null,
        notes: editRow.notes || null,
      });
      cancelEdit();
      await load(page, perPage);
      push("Student saved", "success");
    } catch (err) {
      const server = err?.response?.data;
      push((server && (server.error || server.message)) || "Error saving student", "error");
    }
  }

  function askRemove(s) {
    const totalMarks = (s.present_count ?? 0) + (s.absent_count ?? 0);
    const msg =
      totalMarks > 0
        ? `This student has ${s.present_count ?? 0} “Present” and ${s.absent_count ?? 0} “Absent” records.\n\nIf you delete this student, their entire attendance history will be deleted too. This action cannot be undone.`
        : `This action cannot be undone.`;
    setConfirm({ open: true, id: s.id, message: msg });
  }
  async function doRemove() {
    const id = confirm.id;
    setConfirm({ open: false, id: null, message: "" });
    try {
      await api.delete(`/students/${id}`);
      const nextPage = students.length === 1 && page > 1 ? page - 1 : page;
      await load(nextPage, perPage);
      push("Student deleted (attendance history removed)", "success");
    } catch (err) {
      const server = err?.response?.data;
      push((server && (server.error || server.message)) || "Error deleting student", "error");
    }
  }

  /* ----------------------------- Import/Export ----------------------------- */
  async function downloadFile(path, fallbackName) {
    const res = await api.get(path, { responseType: "blob" });
    const cd = res.headers["content-disposition"] || "";
    const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
    const filename = decodeURIComponent(m?.[1] || m?.[2] || fallbackName);

    const blob = new Blob([res.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
  async function doExport() {
    try { await downloadFile("/students/export", "students.xlsx"); }
    catch { push("Export failed", "error"); }
  }
  async function downloadTemplate() {
    try { await downloadFile("/students/template", "students_template.xlsx"); }
    catch { push("Download failed", "error"); }
  }
  async function doImport() {
    if (!file) return push("Choose a file first", "error");
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/students/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      push(`Imported: ${data.inserted} inserted, ${data.updated} updated, ${data.skipped} skipped`, "success");
      setFile(null);
      await load(1, perPage);
    } catch (err) {
      const server = err?.response?.data;
      push((server && (server.error || server.message)) || "Import failed", "error");
    } finally {
      setImporting(false);
    }
  }

  /* ------------------------------ Notes ------------------------------- */
  async function saveNote(studentId, text) {
    try {
      await api.put(`/students/${studentId}/notes`, { notes: text || null });
      setNoteOpen(false);
      setNoteStudent(null);
      await load(page, perPage);
      push("Note saved", "success");
    } catch (err) {
      const server = err?.response?.data;
      push((server && (server.error || server.message)) || "Error saving note", "error");
    }
  }

  /* -------------------------- Search & Paging ------------------------- */
  async function onSearch() { await load(1, perPage); }
  function clearFilters() {
    setFilter({ name: "", phone: "", gender: "", graduation_year: "", sort: "id_desc" });
    load(1, perPage);
  }
  function changePerPage(v) {
    const n = parseInt(v, 10) || 12;
    setPerPage(n);
    load(1, n);
  }
  function prevPage() { if (page > 1) load(page - 1, perPage); }
  function nextPage() { if (page < totalPages) load(page + 1, perPage); }

  // chips helper
  function clearOne(key) { setFilter(f => ({ ...f, [key]: "" })); }
  const activeChips = [
    filter.name && { key: "name", label: `Name: ${filter.name}` },
    filter.phone && { key: "phone", label: `Phone: ${filter.phone}` },
    filter.gender && { key: "gender", label: `Gender: ${filter.gender}` },
    filter.graduation_year && { key: "graduation_year", label: `Year: ${filter.graduation_year}` },
    filter.sort !== "id_desc" && { key: "sort", label: `Sort: ${filter.sort.replace("_", " ")}` },
  ].filter(Boolean);

  /* -------------------------- Card helpers --------------------------- */
  const [editOpen, setEditOpen] = useState(false);
  function openEditSheet(s) {
    startEdit(s);
    setEditOpen(true);
  }
  function onCardClick(e, s) {
    // If the click happened on an action area, do nothing
    if (e.target.closest(".card-actions")) return;
    openEditSheet(s);
  }
  function onCardKey(e, s) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openEditSheet(s);
    }
  }

  return (
    <section className="section students-page">
      {/* ======= Header / KPIs ======= */}
      <div className="header-row">
        <div>
          <h2 className="h2">Students</h2>
          <div className="kpis">
            <span className="badge kpi">Total: <b>{total}</b></span>
            <span className="badge kpi">Per page: <b>{perPage}</b></span>
          </div>
        </div>

        {/* Actions */}
        <div className="split-actions" ref={splitRef}>
          <button className="btn" onClick={() => setAddOpen(true)}>+ New student</button>
          <div className={`split ${menuOpen ? "open" : ""}`}>
            <button className="btn" type="button" onClick={() => setMenuOpen(v => !v)} aria-haspopup="menu" aria-expanded={menuOpen}>More</button>
            <div className="menu" role="menu">
              <button onClick={downloadTemplate} type="button" role="menuitem">Download template</button>
              <label className="upload" role="menuitem">
                Import (.xlsx/.csv)
                <input type="file" accept=".xlsx,.xls,.csv" onChange={(e)=>setFile(e.target.files?.[0]||null)} />
              </label>
              <button onClick={doImport} disabled={!file || importing} type="button" role="menuitem">
                {importing ? "Importing…" : "Start import"}
              </button>
              <button onClick={doExport} type="button" role="menuitem">Export Excel</button>
            </div>
          </div>
        </div>
      </div>

      {/* ======= Toolbar / Filters ======= */}
      <div className="card filters-pro">
        <div className="toolbar-pro">
          <div className="field">
            <input
              className="input big"
              placeholder="Search by name (first / father / last)…"
              value={filter.name}
              onChange={(e)=>setFilter(f=>({...f, name:e.target.value}))}
            />
          </div>
          <div className="field">
            <input
              className="input"
              placeholder="Phone"
              value={filter.phone}
              onChange={(e)=>setFilter(f=>({...f, phone:e.target.value}))}
            />
          </div>
          <div className="field pills">
            <span className="label">Gender</span>
            <div className="pillset">
              <button type="button" className={`pill ${filter.gender===""?"active":""}`} onClick={()=>setFilter(f=>({...f, gender:""}))}>All</button>
              <button type="button" className={`pill ${filter.gender==="Male"?"active":""}`} onClick={()=>setFilter(f=>({...f, gender:"Male"}))}>Male</button>
              <button type="button" className={`pill ${filter.gender==="Female"?"active":""}`} onClick={()=>setFilter(f=>({...f, gender:"Female"}))}>Female</button>
            </div>
          </div>
          <div className="field">
            <input
              className="input"
              placeholder="Graduation year (e.g. 2027)"
              type="number"
              value={filter.graduation_year}
              onChange={(e)=>setFilter(f=>({...f, graduation_year:e.target.value}))}
            />
          </div>
          <div className="field pills">
            <span className="label">Sort</span>
            <div className="pillset">
              <button type="button" className={`pill ${filter.sort==="name_asc"?"active":""}`} onClick={()=>setFilter(f=>({...f, sort:"name_asc"}))}>Name A–Z</button>
              <button type="button" className={`pill ${filter.sort==="name_desc"?"active":""}`} onClick={()=>setFilter(f=>({...f, sort:"name_desc"}))}>Name Z–A</button>
              <button type="button" className={`pill ${filter.sort==="id_desc"?"active":""}`} onClick={()=>setFilter(f=>({...f, sort:"id_desc"}))}>Newest</button>
              <button type="button" className={`pill ${filter.sort==="id_asc"?"active":""}`} onClick={()=>setFilter(f=>({...f, sort:"id_asc"}))}>Oldest</button>
            </div>
          </div>
          <div className="field actions">
            <button className="btn primary" onClick={onSearch}>Search</button>
            <button className="btn ghost" onClick={clearFilters}>Reset</button>
            <label className="density">
              <input type="checkbox" checked={dense} onChange={()=>setDense(d=>!d)} />
              Compact
            </label>
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="chips">
            {activeChips.map(ch => (
              <button key={ch.key} className="chip" onClick={() => clearOne(ch.key)} type="button">
                {ch.label} <span aria-hidden>×</span>
              </button>
            ))}
            <span className="chips-hint">Press <b>Search</b> to apply.</span>
          </div>
        )}
      </div>

      {/* ======= Cards ======= */}
      <div className={`card cards-wrap ${dense ? "dense" : ""}`}>
        {loading ? (
          <div className="empty-row">Loading...</div>
        ) : students.length === 0 ? (
          <div className="empty-row">No students</div>
        ) : (
          <div className="grid-cards">
            {students.map((s) => {
              const c = colorFor(s.id);
              return (
                <article
                  key={s.id}
                  className="student-card"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => onCardClick(e, s)}
                  onKeyDown={(e) => onCardKey(e, s)}
                >
                  <div className="card-top">
                    <div className="avatar" style={{ background: c.bg, color: c.fg, outlineColor: c.ring }}>
                      {initials(s.name, s.father_name, s.last_name)}
                    </div>
                    <div className="id-badge">#{s.id}</div>
                  </div>

                  <h4 className="name">
                    {s.name} {s.father_name ? <span className="muted">{s.father_name}</span> : null} {s.last_name || ""}
                  </h4>

                  <div className="meta">
                    <div><span className="label">Phone</span> {s.phone}</div>
                    {s.graduation_year && <div><span className="label">Year</span> {s.graduation_year}</div>}
                    {s.gender && <div><span className="label">Gender</span> {s.gender}</div>}
                  </div>

                  <div className="counts">
                    <span className="count present">P {s.present_count ?? 0}</span>
                    <span className="count absent">A {s.absent_count ?? 0}</span>
                  </div>

                  <div className="card-actions">
                    <button className="btn tiny" onClick={(e) => { e.stopPropagation(); openEditSheet(s); }} type="button">Edit</button>
                    <button
                      className="btn tiny"
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setNoteStudent(s); setNoteOpen(true); }}
                      title={s.notes ? "Edit note" : "Add note"}
                    >
                      {s.notes ? "Notes" : "Add note"}
                    </button>
                    <button className="btn tiny danger" onClick={(e) => { e.stopPropagation(); askRemove(s); }} type="button">Delete</button>
                    <button className="btn tiny ghost" onClick={(e) => { e.stopPropagation(); navigate(`/students/${s.id}`); }} type="button">Profile</button>
                  </div>

                  {/* Keep overlay element (disabled by CSS pointer-events) */}
                  <button className="card-overlay" aria-hidden="true" tabIndex={-1}></button>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ======= Pagination ======= */}
      <div className="card">
        <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div className="rows-per-page">
            <label>Rows per page</label><br />
            <select className="select" value={perPage} onChange={(e) => changePerPage(e.target.value)}>
              <option value={12}>12</option>
              <option value={20}>20</option>
              <option value={40}>40</option>
              <option value={80}>80</option>
            </select>
          </div>
          <div className="pager">
            <button className="btn" onClick={prevPage} disabled={page <= 1}>Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button className="btn" onClick={nextPage} disabled={page >= totalPages}>Next</button>
            <span style={{ marginLeft: 12 }}>{total} total</span>
          </div>
          <div className="density-toggle">
            <label className="density">
              <input type="checkbox" checked={dense} onChange={() => setDense(d => !d)} />
              Compact
            </label>
          </div>
        </div>
      </div>

      {/* ======= Delete confirmation ======= */}
      <Confirm
        open={confirm.open}
        title="Delete student?"
        message={confirm.message || "This action cannot be undone."}
        onCancel={() => setConfirm({ open: false, id: null, message: "" })}
        onConfirm={doRemove}
      />

      {/* ======= Note modal (opens directly from card button) ======= */}
      <NoteModal
        open={noteOpen}
        student={noteStudent}
        initialNote={noteStudent?.notes || ""}
        onSave={(text) => saveNote(noteStudent.id, text)}
        onClose={() => { setNoteOpen(false); setNoteStudent(null); }}
      />

      {/* ======= Add Student Sheet ======= */}
      <SideSheet
        open={addOpen}
        title="Add student"
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <button className="btn" onClick={()=>setAddOpen(false)} type="button">Cancel</button>
            <button className="btn primary" onClick={onAddSubmit} type="button">Add Student</button>
          </>
        }
      >
        <form onSubmit={onAddSubmit} className="sheet-form">
          <div className="grid-2">
            <div><label>First Name *</label><input className="input" value={form.name} onChange={(e)=>setForm(f=>({...f, name:e.target.value}))} /></div>
            <div><label>Father Name</label><input className="input" value={form.father_name} onChange={(e)=>setForm(f=>({...f, father_name:e.target.value}))} /></div>
            <div><label>Last Name</label><input className="input" value={form.last_name} onChange={(e)=>setForm(f=>({...f, last_name:e.target.value}))} /></div>
            <div><label>Phone *</label><input className="input" value={form.phone} onChange={(e)=>setForm(f=>({...f, phone:e.target.value}))} /></div>
            <div><label>Address</label><input className="input" value={form.address} onChange={(e)=>setForm(f=>({...f, address:e.target.value}))} /></div>
            <div><label>Birthdate</label><input type="date" className="input" value={form.birthdate} onChange={(e)=>setForm(f=>({...f, birthdate:e.target.value}))} /></div>
            <div><label>Gender</label>
              <select className="select" value={form.gender} onChange={(e)=>setForm(f=>({...f, gender:e.target.value}))}>
                <option value="">(select)</option><option>Male</option><option>Female</option>
              </select>
            </div>
            <div><label>Source</label><input className="input" value={form.source} onChange={(e)=>setForm(f=>({...f, source:e.target.value}))} placeholder="Manual / Excel / Referral / Website..." /></div>
            <div><label>Graduation Year</label><input type="number" className="input" value={form.graduation_year} onChange={(e)=>setForm(f=>({...f, graduation_year:e.target.value}))} placeholder="e.g. 2026" /></div>
            <div className="grid-col-span-2"><label>Notes</label><textarea className="input" rows="3" value={form.notes} onChange={(e)=>setForm(f=>({...f, notes:e.target.value}))} /></div>
          </div>
        </form>
      </SideSheet>

      {/* ======= Edit Student Sheet ======= */}
      <SideSheet
        open={editOpen}
        title={`Edit #${editId ?? ""}`}
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <button className="btn" onClick={()=>setEditOpen(false)} type="button">Close</button>
            {editId && <button className="btn primary" onClick={()=>saveEdit(editId)} type="button">Save changes</button>}
          </>
        }
      >
        <form onSubmit={(e)=>{e.preventDefault(); if(editId) saveEdit(editId);}} className="sheet-form">
          <div className="grid-2">
            <div><label>First Name</label><input className="input" value={editRow.name} onChange={(e)=>setEditRow(r=>({...r, name:e.target.value}))} /></div>
            <div><label>Father Name</label><input className="input" value={editRow.father_name} onChange={(e)=>setEditRow(r=>({...r, father_name:e.target.value}))} /></div>
            <div><label>Last Name</label><input className="input" value={editRow.last_name} onChange={(e)=>setEditRow(r=>({...r, last_name:e.target.value}))} /></div>
            <div><label>Phone</label><input className="input" value={editRow.phone} onChange={(e)=>setEditRow(r=>({...r, phone:e.target.value}))} /></div>
            <div><label>Address</label><input className="input" value={editRow.address} onChange={(e)=>setEditRow(r=>({...r, address:e.target.value}))} /></div>
            <div><label>Birthdate</label><input type="date" className="input" value={editRow.birthdate || ""} onChange={(e)=>setEditRow(r=>({...r, birthdate:e.target.value}))} /></div>
            <div><label>Gender</label>
              <select className="select" value={editRow.gender} onChange={(e)=>setEditRow(r=>({...r, gender:e.target.value}))}>
                <option value="">(select)</option><option>Male</option><option>Female</option>
              </select>
            </div>
            <div><label>Source</label><input className="input" value={editRow.source} onChange={(e)=>setEditRow(r=>({...r, source:e.target.value}))} /></div>
            <div><label>Graduation Year</label><input type="number" className="input" value={editRow.graduation_year || ""} onChange={(e)=>setEditRow(r=>({...r, graduation_year:e.target.value}))} /></div>
            <div className="grid-col-span-2"><label>Notes</label><textarea className="input" rows="3" value={editRow.notes || ""} onChange={(e)=>setEditRow(r=>({...r, notes:e.target.value}))} /></div>
          </div>

          {editId && (
            <div className="sheet-inline-actions">
              <button className="btn" type="button" onClick={() => { setNoteStudent({ id: editId, notes: editRow.notes }); setNoteOpen(true); }}>Open notes dialog</button>
              <button className="btn danger" type="button" onClick={() => { setEditOpen(false); setConfirm({ open: true, id: editId, message: "This action cannot be undone." }); }}>Delete student</button>
              <button className="btn ghost" type="button" onClick={() => navigate(`/students/${editId}`)}>Open profile</button>
            </div>
          )}
        </form>
      </SideSheet>
    </section>
  );
}
