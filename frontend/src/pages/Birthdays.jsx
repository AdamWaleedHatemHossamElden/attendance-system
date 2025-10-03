import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import '../styles/birthdays.css';

// Toggle for future use (kept logic, UI hidden by default)
const SHOW_CONTACT_ACTIONS = false;

function todayYMD() {
  const d = new Date();
  return [d.getFullYear(), d.getMonth(), d.getDate()];
}
function ymdKey(y, m, d) {
  const mm = String(m + 1).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}
function onlyDigits(s = '') {
  return String(s).replace(/\D+/g, '');
}
function niceDate(y, m, d) {
  return new Date(y, m, d).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}
function ageFromBirthdate(birthdate) {
  try {
    const d = new Date(birthdate);
    const diff = new Date(Date.now() - d.getTime());
    return Math.abs(diff.getUTCFullYear() - 1970);
  } catch {
    return '';
  }
}

/**
 * Birthdays page (scoped styles so nothing leaks globally)
 * Endpoints used:
 *   GET  /api/reports/birthdays?month={1..12}
 *   GET  /api/reports/birthdays/export?month={1..12}  (xlsx blob)
 */
export default function Birthdays() {
  const [nowY, nowM, nowD] = todayYMD();

  // Calendar view (month is 0-based for Date, API expects 1..12)
  const [year, setYear] = useState(nowY);
  const [month, setMonth] = useState(nowM);

  // Data for this month
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // Selected day in current month
  const [selectedDay, setSelectedDay] = useState(nowY === year && nowM === month ? nowD : 1);

  // Fetch birthdays for the month
  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setErr('');
      try {
        const { data } = await api.get('/reports/birthdays', { params: { month: month + 1 } });
        if (!ignore) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!ignore) {
          setRows([]);
          setErr(e?.response?.data?.error || 'Failed to load birthdays');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [month]);

  // Map by day: 'YYYY-MM-DD' -> people[]
  const byDay = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      if (!r.birthdate) continue;
      const d = new Date(r.birthdate);
      const key = ymdKey(year, month, d.getDate());
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    for (const arr of map.values()) arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return map;
  }, [rows, month, year]);

  // Build 6x7 calendar cells
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startDow = (first.getDay() + 6) % 7; // Mon=0 … Sun=6
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    const out = [];
    for (let i = startDow - 1; i >= 0; i--) {
      out.push({
        y: month === 0 ? year - 1 : year,
        m: month === 0 ? 11 : month - 1,
        d: prevDays - i,
        outside: true,
      });
    }
    for (let d = 1; d <= daysInMonth; d++) out.push({ y: year, m: month, d, outside: false });
    while (out.length < 42) {
      const last = out[out.length - 1];
      const next = new Date(last.y, last.m, last.d + 1);
      out.push({ y: next.getFullYear(), m: next.getMonth(), d: next.getDate(), outside: true });
    }
    return out;
  }, [year, month]);

  const selectedKey = ymdKey(year, month, selectedDay);
  const people = byDay.get(selectedKey) || [];

  // KPIs
  const thisMonthCount = rows.length;
  const [tY, tM, tD] = todayYMD();
  const todayKey = ymdKey(tY, tM, tD);
  const todayCount = byDay.get(todayKey)?.length || 0;

  // Upcoming (next 7 days) from "today"
  const upcoming = useMemo(() => {
    const list = [];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(tY, tM, tD + i);
      const key = ymdKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
      const arr = byDay.get(key);
      if (arr?.length) list.push({ date: dt, arr });
    }
    return list;
  }, [byDay, tY, tM, tD]);

  function prevMonth() {
    const d = new Date(year, month - 1, 1);
    setYear(d.getFullYear()); setMonth(d.getMonth()); setSelectedDay(1);
  }
  function nextMonth() {
    const d = new Date(year, month + 1, 1);
    setYear(d.getFullYear()); setMonth(d.getMonth()); setSelectedDay(1);
  }
  function jumpToday() { setYear(tY); setMonth(tM); setSelectedDay(tD); }

  async function exportMonth() {
    try {
      const resp = await api.get('/reports/birthdays/export', {
        params: { month: month + 1 },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `birthdays-month-${month + 1}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Export failed');
    }
  }

  function exportDayCsv() {
    if (!people.length) return;
    const headers = ['ID', 'Name', 'Phone', 'Birthdate', 'Age'];
    const lines = people.map(p =>
      [p.id, csv(p.name), csv(p.phone), csv(p.birthdate?.slice(0, 10)), p.age ?? ageFromBirthdate(p.birthdate)].join(',')
    );
    const csvText = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `birthdays-${selectedKey}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  function csv(v) {
    if (v == null) return '';
    const s = String(v);
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function copyGreeting(name, age) {
    const msg = `Happy Birthday ${name}! 🎉 Wishing you a wonderful year ahead. (${age} today)`;
    navigator.clipboard?.writeText(msg);
  }

  return (
    // NOTE: the "birthdays-page" class scopes all CSS to this page only
    <section className="section birthdays-page">
      <h2 className="h2">Birthdays</h2>

      {err && <div className="alert error" style={{ marginBottom: 10 }}>{err}</div>}

      <div className="birthdays-grid">
        {/* LEFT: Calendar & actions */}
        <div className="panel">
          <div className="panel__frame">
            <div className="panel__badge" aria-hidden="true">
              {/* cake icon */}
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" strokeWidth="1.8">
                <path d="M12 3v3" /><path d="M8 7h8a4 4 0 0 1 4 4v2H4v-2a4 4 0 0 1 4-4Z" />
                <path d="M2 21h20v-5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v5Z" />
              </svg>
            </div>

            <div className="cal-head">
              <button className="btn" onClick={prevMonth}>&lt;</button>
              <div className="cal-title">
                {new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </div>
              <button className="btn" onClick={nextMonth}>&gt;</button>
            </div>

            <div className="cal-kpis">
              <span className="badge">This month: {thisMonthCount}</span>
              <span className="badge">Today: {todayCount}</span>
              <button className="btn" onClick={jumpToday}>Today</button>
              <button className="btn" onClick={exportMonth}>Export Month</button>
            </div>

            <div className="calendar">
              <div className="dow">Mon</div><div className="dow">Tue</div><div className="dow">Wed</div>
              <div className="dow">Thu</div><div className="dow">Fri</div><div className="dow">Sat</div><div className="dow">Sun</div>

              {cells.map((c, i) => {
                const key = ymdKey(c.y, c.m, c.d);
                const has = byDay.has(key);
                const isSel = !c.outside && c.d === selectedDay && c.m === month && c.y === year;
                const isToday = key === todayKey;
                return (
                  <button
                    key={i}
                    className={`cal-cell ${c.outside ? 'outside' : ''} ${isSel ? 'selected' : ''}`}
                    onClick={() => { if (!c.outside && c.m === month) setSelectedDay(c.d); }}
                    disabled={c.outside}
                    title={has ? `${(byDay.get(key) || []).length} birthdays` : ''}
                  >
                    <span className={`cal-num ${isToday ? 'today' : ''}`}>{c.d}</span>
                    {has && <span className="dot" />}
                  </button>
                );
              })}
            </div>

            {loading && <div className="muted" style={{ marginTop: 8 }}>Loading…</div>}
          </div>
        </div>

        {/* RIGHT: Banner + list for selected day + upcoming */}
        <div className="panel">
          <div className="panel__frame">
            <div className="panel__badge" aria-hidden="true">
              {/* calendar icon */}
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" strokeWidth="1.8">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>

            <div className="banner">
              <div className="banner-left">
                <div className="banner-title">
                  {ymdKey(year, month, selectedDay) === todayKey ? 'Today’s Birthdays' : `Birthdays • ${niceDate(year, month, selectedDay)}`}
                </div>
                <div className="banner-sub">
                  {people.length ? `${people.length} ${people.length === 1 ? 'person' : 'people'}` : 'No birthdays on this day'}
                </div>
              </div>
              <div className="banner-actions">
                <button className="btn" onClick={exportDayCsv} disabled={!people.length}>Export Day</button>
              </div>
            </div>

            <div className="cards">
              {people.length ? people.map(p => {
                const age = p.age ?? ageFromBirthdate(p.birthdate);
                const phoneRaw = SHOW_CONTACT_ACTIONS ? onlyDigits(p.phone) : null;
                return (
                  <div className="card" key={p.id}>
                    <div className="avatar">{(p.name || '?').slice(0,1).toUpperCase()}</div>
                    <div className="card-main">
                      <div className="card-name">{p.name}</div>
                      <div className="card-meta">
                        <span className="pill">Age {age}</span>
                        <span className="pill">{(p.birthdate || '').slice(0,10)}</span>
                        {p.phone && <span className="pill">{p.phone}</span>}
                      </div>

                      {SHOW_CONTACT_ACTIONS && (
                        <div className="card-actions">
                          {phoneRaw && <a className="btn" href={`tel:${phoneRaw}`}>Call</a>}
                          {phoneRaw && <a className="btn" target="_blank" rel="noreferrer" href={`https://wa.me/${phoneRaw}`}>WhatsApp</a>}
                          <button className="btn" onClick={() => copyGreeting(p.name, age)}>Copy Msg</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <div className="empty">Pick a highlighted day on the calendar to see birthdays here.</div>
              )}
            </div>

            <div className="upcoming">
              <div className="up-head">Upcoming (next 7 days)</div>
              {upcoming.length ? (
                <ul className="up-list">
                  {upcoming.map(({ date, arr }) => (
                    <li key={date.toISOString()} className="up-item">
                      <div className="up-date">{date.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' })}</div>
                      <div className="up-names">{arr.map(p => p.name).join(', ')}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="muted">No upcoming birthdays within 7 days.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
