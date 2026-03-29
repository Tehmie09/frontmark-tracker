import { useState, useMemo } from "react";

const TEACHERS = [
  "Mr. Victor", "Mrs. Paul", "Miss. Bukola", "Mrs. Cynthia",
  "Mr. Samuel", "Mrs. Joyful", "Mr. Toyosi", "Mrs. Blessing",
  "Mr. Ikechukwu", "Miss. Favour"
];

const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const FINE_AMOUNT = 200;

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDay(year, month) {
  return new Date(year, month, 1).getDay();
}
function isWeekend(year, month, day) {
  const d = new Date(year, month, day).getDay();
  return d === 0 || d === 6;
}

export default function App() {
  const today = new Date();
  const [view, setView] = useState("calendar"); // calendar | records | teachers
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [records, setRecords] = useState({}); // { "YYYY-MM-DD": [{ teacher, timePaid }] }
  const [teachers, setTeachers] = useState(TEACHERS);
  const [newTeacher, setNewTeacher] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeachersForDate, setSelectedTeachersForDate] = useState([]);

  const dateKey = (y, m, d) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  const lateOnDate = (key) => records[key] || [];

  const markedDays = useMemo(() => {
    const days = new Set();
    Object.keys(records).forEach(k => {
      if (records[k].length > 0) days.add(k);
    });
    return days;
  }, [records]);

  const openDateModal = (day) => {
    if (isWeekend(currentYear, currentMonth, day)) return;
    const key = dateKey(currentYear, currentMonth, day);
    const existing = (records[key] || []).map(r => r.teacher);
    setSelectedDate({ day, key });
    setSelectedTeachersForDate(existing);
    setModalOpen(true);
  };

  const saveLateness = () => {
    const existing = records[selectedDate.key] || [];
    const existingMap = {};
    existing.forEach(r => existingMap[r.teacher] = r);
    const updated = selectedTeachersForDate.map(t => existingMap[t] || { teacher: t, timePaid: null });
    setRecords(prev => ({ ...prev, [selectedDate.key]: updated }));
    setModalOpen(false);
  };

  const togglePaid = (dateKey, teacher) => {
    setRecords(prev => {
      const list = [...(prev[dateKey] || [])];
      const idx = list.findIndex(r => r.teacher === teacher);
      if (idx >= 0) {
        list[idx] = { ...list[idx], timePaid: list[idx].timePaid ? null : new Date().toLocaleTimeString() };
      }
      return { ...prev, [dateKey]: list };
    });
  };

  const addTeacher = () => {
    const name = newTeacher.trim();
    if (name && !teachers.includes(name)) {
      setTeachers(prev => [...prev, name]);
      setNewTeacher("");
    }
  };

  const removeTeacher = (name) => {
    setTeachers(prev => prev.filter(t => t !== name));
  };

  // Summary stats
  const allRecords = useMemo(() => {
    const flat = [];
    Object.entries(records).forEach(([date, list]) => {
      list.forEach(r => flat.push({ date, ...r }));
    });
    return flat;
  }, [records]);

  const teacherStats = useMemo(() => {
    const stats = {};
    teachers.forEach(t => stats[t] = { late: 0, paid: 0, unpaid: 0 });
    allRecords.forEach(r => {
      if (!stats[r.teacher]) stats[r.teacher] = { late: 0, paid: 0, unpaid: 0 };
      stats[r.teacher].late++;
      if (r.timePaid) stats[r.teacher].paid++;
      else stats[r.teacher].unpaid++;
    });
    return stats;
  }, [allRecords, teachers]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDay(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f1117",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: "#e8e0d0",
      padding: "0 0 60px"
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a1f2e 0%, #0f1117 100%)",
        borderBottom: "2px solid #c9a84c",
        padding: "20px 24px 0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            background: "linear-gradient(135deg, #c9a84c, #8b6914)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18
          }}>⏰</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#c9a84c", letterSpacing: 1 }}>
              Frontmark College
            </div>
            <div style={{ fontSize: 11, color: "#888", letterSpacing: 2, textTransform: "uppercase" }}>
              Staff Punctuality Tracker
            </div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#c9a84c" }}>Fine: ₦{FINE_AMOUNT}</div>
            <div style={{ fontSize: 11, color: "#666" }}>per late arrival</div>
          </div>
        </div>
        {/* Nav */}
        <div style={{ display: "flex", gap: 0, marginTop: 8 }}>
          {[["calendar","📅 Calendar"],["records","📋 Records"],["teachers","👨‍🏫 Teachers"]].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)} style={{
              background: view === v ? "#c9a84c" : "transparent",
              color: view === v ? "#0f1117" : "#888",
              border: "none",
              padding: "10px 18px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: view === v ? "bold" : "normal",
              borderRadius: "6px 6px 0 0",
              fontFamily: "inherit",
              letterSpacing: 0.5
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* CALENDAR VIEW */}
      {view === "calendar" && (
        <div style={{ padding: "24px 16px" }}>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <button onClick={prevMonth} style={navBtnStyle}>‹</button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, color: "#c9a84c", fontWeight: "bold" }}>{MONTHS[currentMonth]}</div>
              <div style={{ fontSize: 13, color: "#666" }}>{currentYear}</div>
            </div>
            <button onClick={nextMonth} style={navBtnStyle}>›</button>
          </div>

          {/* Day labels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 6 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, color: d === "Sun" || d === "Sat" ? "#444" : "#888", letterSpacing: 1, padding: "4px 0" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const key = dateKey(currentYear, currentMonth, day);
              const isToday = today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day;
              const hasLate = markedDays.has(key);
              const lateList = lateOnDate(key);
              const allPaid = lateList.length > 0 && lateList.every(r => r.timePaid);
              const somePaid = lateList.some(r => r.timePaid) && !allPaid;
              const weekend = isWeekend(currentYear, currentMonth, day);

              return (
                <div key={day} onClick={() => !weekend && openDateModal(day)} style={{
                  background: isToday ? "#1e2a3a" : hasLate ? (allPaid ? "#1a2e1a" : somePaid ? "#2a2a1a" : "#2e1a1a") : "#1a1f2e",
                  border: isToday ? "1.5px solid #c9a84c" : hasLate ? (allPaid ? "1px solid #4a9a4a" : "1px solid #9a3a3a") : "1px solid #2a2f3e",
                  borderRadius: 8,
                  padding: "8px 4px",
                  cursor: weekend ? "default" : "pointer",
                  opacity: weekend ? 0.3 : 1,
                  minHeight: 56,
                  position: "relative",
                  transition: "all 0.15s"
                }}>
                  <div style={{ fontSize: 14, textAlign: "center", color: isToday ? "#c9a84c" : "#d0c8b8", fontWeight: isToday ? "bold" : "normal" }}>
                    {day}
                  </div>
                  {hasLate && (
                    <div style={{ textAlign: "center", marginTop: 2 }}>
                      <div style={{ fontSize: 10, color: allPaid ? "#4a9a4a" : "#e85555" }}>
                        {lateList.length} late
                      </div>
                      {allPaid && <div style={{ fontSize: 9, color: "#4a9a4a" }}>✓ paid</div>}
                      {somePaid && <div style={{ fontSize: 9, color: "#c9a84c" }}>partial</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ marginTop: 20, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
            {[["#2e1a1a","#9a3a3a","Late (unpaid)"],["#2a2a1a","#c9a84c","Partially paid"],["#1a2e1a","#4a9a4a","All fines paid"],["#1e2a3a","#c9a84c","Today"]].map(([bg, border, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: bg, border: `1.5px solid ${border}` }} />
                <span style={{ fontSize: 11, color: "#888" }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Quick stats */}
          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              ["📌", allRecords.length, "Total Late"],
              ["💸", allRecords.filter(r => !r.timePaid).length, "Unpaid"],
              ["✅", allRecords.filter(r => r.timePaid).length, "Paid"],
            ].map(([icon, val, label]) => (
              <div key={label} style={{ background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: 10, padding: "14px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 20 }}>{icon}</div>
                <div style={{ fontSize: 22, fontWeight: "bold", color: "#c9a84c" }}>{val}</div>
                <div style={{ fontSize: 11, color: "#666" }}>{label}</div>
                {label !== "Total Late" && <div style={{ fontSize: 11, color: "#888" }}>₦{val * FINE_AMOUNT}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECORDS VIEW */}
      {view === "records" && (
        <div style={{ padding: "24px 16px" }}>
          <div style={{ fontSize: 16, color: "#c9a84c", marginBottom: 16, fontWeight: "bold" }}>All Lateness Records</div>
          {Object.keys(records).filter(k => records[k].length > 0).sort().reverse().map(dateKey => (
            <div key={dateKey} style={{ background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: 10, marginBottom: 12, overflow: "hidden" }}>
              <div style={{ background: "#1e2640", padding: "10px 14px", borderBottom: "1px solid #2a2f3e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#c9a84c", fontSize: 13, fontWeight: "bold" }}>
                  📅 {new Date(dateKey + "T12:00:00").toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </span>
                <span style={{ fontSize: 11, color: "#888" }}>{records[dateKey].length} teacher{records[dateKey].length !== 1 ? "s" : ""}</span>
              </div>
              {records[dateKey].map(r => (
                <div key={r.teacher} style={{ padding: "10px 14px", borderBottom: "1px solid #1e2230", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#e0d8c8" }}>{r.teacher}</div>
                    <div style={{ fontSize: 11, color: r.timePaid ? "#4a9a4a" : "#e85555" }}>
                      {r.timePaid ? `✅ Paid ₦${FINE_AMOUNT} at ${r.timePaid}` : `⚠️ Fine pending: ₦${FINE_AMOUNT}`}
                    </div>
                  </div>
                  <button onClick={() => togglePaid(dateKey, r.teacher)} style={{
                    background: r.timePaid ? "#1a2e1a" : "#2e1a1a",
                    color: r.timePaid ? "#4a9a4a" : "#e85555",
                    border: `1px solid ${r.timePaid ? "#4a9a4a" : "#9a3a3a"}`,
                    borderRadius: 6,
                    padding: "5px 10px",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "inherit"
                  }}>
                    {r.timePaid ? "Undo" : "Mark Paid"}
                  </button>
                </div>
              ))}
            </div>
          ))}
          {Object.keys(records).filter(k => records[k].length > 0).length === 0 && (
            <div style={{ textAlign: "center", color: "#444", marginTop: 60, fontSize: 14 }}>
              No records yet. Tap a calendar day to mark late teachers.
            </div>
          )}
        </div>
      )}

      {/* TEACHERS VIEW */}
      {view === "teachers" && (
        <div style={{ padding: "24px 16px" }}>
          <div style={{ fontSize: 16, color: "#c9a84c", marginBottom: 16, fontWeight: "bold" }}>Teacher Summary</div>

          {/* Add teacher */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <input
              value={newTeacher}
              onChange={e => setNewTeacher(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTeacher()}
              placeholder="Add new teacher name..."
              style={{
                flex: 1, background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: 8,
                color: "#e0d8c8", padding: "10px 12px", fontSize: 13, fontFamily: "inherit",
                outline: "none"
              }}
            />
            <button onClick={addTeacher} style={{
              background: "#c9a84c", color: "#0f1117", border: "none", borderRadius: 8,
              padding: "10px 16px", fontWeight: "bold", cursor: "pointer", fontSize: 13, fontFamily: "inherit"
            }}>Add</button>
          </div>

          {teachers.map(t => {
            const s = teacherStats[t] || { late: 0, paid: 0, unpaid: 0 };
            return (
              <div key={t} style={{ background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 14, color: "#e0d8c8", fontWeight: "bold" }}>{t}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 10 }}>
                      <span style={{ fontSize: 11, background: "#2a1e1e", color: "#e85555", padding: "2px 8px", borderRadius: 20 }}>
                        {s.late} late
                      </span>
                      <span style={{ fontSize: 11, background: "#1a2e1a", color: "#4a9a4a", padding: "2px 8px", borderRadius: 20 }}>
                        ₦{s.paid * FINE_AMOUNT} paid
                      </span>
                      {s.unpaid > 0 && (
                        <span style={{ fontSize: 11, background: "#2e2a1a", color: "#c9a84c", padding: "2px 8px", borderRadius: 20 }}>
                          ₦{s.unpaid * FINE_AMOUNT} owed
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => removeTeacher(t)} style={{
                    background: "transparent", color: "#444", border: "1px solid #2a2f3e",
                    borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontFamily: "inherit"
                  }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL - Mark late teachers for a date */}
      {modalOpen && selectedDate && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "flex-end", zIndex: 100
        }} onClick={() => setModalOpen(false)}>
          <div style={{
            background: "#1a1f2e", borderRadius: "20px 20px 0 0",
            border: "1px solid #2a2f3e", borderBottom: "none",
            padding: "20px 16px 32px", width: "100%", maxHeight: "80vh", overflowY: "auto"
          }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#c9a84c" }}>
                Mark Late Teachers
              </div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                {new Date(selectedDate.key + "T12:00:00").toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              {teachers.map(t => {
                const selected = selectedTeachersForDate.includes(t);
                return (
                  <div key={t} onClick={() => setSelectedTeachersForDate(prev =>
                    prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
                  )} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: 8, marginBottom: 6,
                    background: selected ? "#2e1a1a" : "#141820",
                    border: selected ? "1px solid #9a3a3a" : "1px solid #1e2230",
                    cursor: "pointer"
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 4,
                      background: selected ? "#e85555" : "transparent",
                      border: selected ? "2px solid #e85555" : "2px solid #444",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                    }}>
                      {selected && <span style={{ color: "white", fontSize: 12, lineHeight: 1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 14, color: selected ? "#e8a0a0" : "#888" }}>{t}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setModalOpen(false)} style={{
                flex: 1, background: "transparent", color: "#888", border: "1px solid #2a2f3e",
                borderRadius: 10, padding: 14, fontSize: 14, cursor: "pointer", fontFamily: "inherit"
              }}>Cancel</button>
              <button onClick={saveLateness} style={{
                flex: 2, background: "linear-gradient(135deg, #c9a84c, #8b6914)", color: "#0f1117",
                border: "none", borderRadius: 10, padding: 14, fontSize: 14,
                fontWeight: "bold", cursor: "pointer", fontFamily: "inherit"
              }}>
                Save ({selectedTeachersForDate.length} selected)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtnStyle = {
  background: "#1a1f2e", border: "1px solid #2a2f3e", color: "#c9a84c",
  borderRadius: 8, width: 38, height: 38, fontSize: 20, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit"
};
