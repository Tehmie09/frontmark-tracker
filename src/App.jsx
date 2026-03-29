import { useState, useMemo } from "react";

const TEACHERS = [
  "Mr. Victor", "Mrs. Bukola", "Mr. Paul", "Mrs. Cynthia",
  "Mr. Ikechukwu", "Mrs. Amazing", "Mr. Samuel", "Mrs. Joyful",
  "Mr. Blessing", "Mr. Toyosi"
];

const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const FINE_AMOUNT = 200;
const ADMIN_PASSWORD = "Olufunke1";

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [adminTapCount, setAdminTapCount] = useState(0);

  const [view, setView] = useState("calendar");
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [records, setRecords] = useState({});
  const [teachers, setTeachers] = useState(TEACHERS);
  const [newTeacher, setNewTeacher] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeachersForDate, setSelectedTeachersForDate] = useState([]);

  const handleAdminTap = () => {
    const newCount = adminTapCount + 1;
    setAdminTapCount(newCount);
    if (newCount >= 3) {
      setAdminTapCount(0);
      setShowLoginModal(true);
      setPasswordInput("");
      setLoginError("");
    }
  };

  const handleLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLoginModal(false);
      setLoginError("");
    } else {
      setLoginError("Incorrect password. Try again.");
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
  };

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
    if (!isAdmin) return;
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
    if (!isAdmin) return;
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
    if (!isAdmin) return;
    const name = newTeacher.trim();
    if (name && !teachers.includes(name)) {
      setTeachers(prev => [...prev, name]);
      setNewTeacher("");
    }
  };

  const removeTeacher = (name) => {
    if (!isAdmin) return;
    setTeachers(prev => prev.filter(t => t !== name));
  };

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
    <div style={{ minHeight: "100vh", background: "#0f1117", fontFamily: "'Georgia', 'Times New Roman', serif", color: "#e8e0d0", padding: "0 0 60px" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a1f2e 0%, #0f1117 100%)", borderBottom: "2px solid #c9a84c", padding: "20px 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div onClick={handleAdminTap} style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #c9a84c, #8b6914)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer" }}>⏰</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#c9a84c", letterSpacing: 1 }}>Frontmark College</div>
            <div style={{ fontSize: 11, color: "#888", letterSpacing: 2, textTransform: "uppercase" }}>Staff Punctuality Tracker</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            {isAdmin ? (
              <div>
                <div style={{ fontSize: 11, color: "#4a9a4a", marginBottom: 2 }}>🔓 Admin</div>
                <button onClick={handleLogout} style={{ fontSize: 10, background: "transparent", color: "#888", border: "1px solid #444", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontFamily: "inherit" }}>Logout</button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: "#c9a84c" }}>Fine: ₦{FINE_AMOUNT}</div>
                <div style={{ fontSize: 10, color: "#555" }}>👁 View only</div>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <div style={{ display: "flex", gap: 0, marginTop: 8 }}>
          {[["calendar","📅 Calendar"],["records","📋 Records"],["teachers","👨‍🏫 Teachers"]].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)} style={{ background: view === v ? "#c9a84c" : "transparent", color: view === v ? "#0f1117" : "#888", border: "none", padding: "10px 18px", cursor: "pointer", fontSize: 13, fontWeight: view === v ? "bold" : "normal", borderRadius: "6px 6px 0 0", fontFamily: "inherit", letterSpacing: 0.5 }}>{label}</button>
          ))}
        </div>
      </div>

      {/* View-only banner */}
      {!isAdmin && (
        <div style={{ background: "#1a1f2e", borderBottom: "1px solid #2a2f3e", padding: "8px 16px", textAlign: "center", fontSize: 11, color: "#666" }}>
          👁 You are in view-only mode. Tap the ⏰ icon 3 times to log in as admin.
        </div>
      )}

      {/* CALENDAR VIEW */}
      {view === "calendar" && (
        <div style={{ padding: "24px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <button onClick={prevMonth} style={navBtnStyle}>‹</button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, color: "#c9a84c", fontWeight: "bold" }}>{MONTHS[currentMonth]}</div>
              <div style={{ fontSize: 13, color: "#666" }}>{currentYear}</div>
            </div>
            <button onClick={nextMonth} style={navBtnStyle}>›</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 6 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, color: d === "Sun" || d === "Sat" ? "#444" : "#888", letterSpacing: 1, padding: "4px 0" }}>{d}</div>
            ))}
          </div>

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
                <div key={day} onClick={() => !weekend && openDateModal(day)} style={{ background: isToday ? "#1e2a3a" : hasLate ? (allPaid ? "#1a2e1a" : somePaid ? "#2a2a1a" : "#2e1a1a") : "#1a1f2e", border: isToday ? "1.5px solid #c9a84c" : hasLate ? (allPaid ? "1px solid #4a9a4a" : "1px solid #9a3a3a") : "1px solid #2a2f3e", borderRadius: 8, padding: "8px 4px", cursor: isAdmin && !weekend ? "pointer" : "default", opacity: weekend ? 0.3 : 1, minHeight: 56, transition: "all 0.15s" }}>
                  <div style={{ fontSize: 14, textAlign: "center", color: isToday ? "#c9a84c" : "#d0c8b8", fontWeight: isToday ? "bold" : "normal" }}>{day}</div>
                  {hasLate && (
                    <div style={{ textAlign: "center", marginTop: 2 }}>
                      <div style={{ fontSize: 10, color: allPaid ? "#4a9a4a" : "#e85555" }}>{lateList.length} late</div>
                      {allPaid && <div style={{ fontSize: 9, color: "#4a9a4a" }}>✓ paid</div>}
                      {somePaid && <div style={{ fontSize: 9, color: "#c9a84c" }}>partial</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 20, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
            {[["#2e1a1a","#9a3a3a","Late (unpaid)"],["#2a2a1a","#c9a84c","Partially paid"],["#1a2e1a","#4a9a4a","All fines paid"],["#1e2a3a","#c9a84c","Today"]].map(([bg, border, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: bg, border: `1.5px solid ${border}` }} />
                <span style={{ fontSize: 11, color: "#888" }}>{label}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[["📌", allRecords.length, "Total Late"],["💸", allRecords.filter(r => !r.timePaid).length, "Unpaid"],["✅", allRecords.filter(r => r.timePaid).length, "Paid"]].map(([icon, val, label]) => (
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
          {Object.keys(records).filter(k => records[k].length > 0).sort().reverse().map(dk => (
            <div key={dk} style={{ background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: 10, marginBottom: 12, overflow: "hidden" }}>
              <div style={{ background: "#1e2640", padding: "10px 14px", borderBottom: "1px solid #2a2f3e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#c9a84c", fontSize: 13, fontWeight: "bold" }}>
                  📅 {new Date(dk + "T12:00:00").toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </span>
                <span style={{ fontSize: 11, color: "#888" }}>{records[dk].length} teacher{records[dk].length !== 1 ? "s" : ""}</span>
              </div>
              {records[dk].map(r => (
                <div key={r.teacher} style={{ padding: "10px 14px", borderBottom: "1px solid #1e2230", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#e0d8c8" }}>{r.teacher}</div>
                    <div style={{ fontSize: 11, color: r.timePaid ? "#4a9a4a" : "#e85555" }}>
                      {r.timePaid ? `✅ Paid ₦${FINE_AMOUNT} at ${r.timePaid}` : `⚠️ Fine pending: ₦${FINE_AMOUNT}`}
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => togglePaid(dk, r.teacher)} style={{ background: r.timePaid ? "#1a2e1a" : "#2e1a1a", color: r.timePaid ? "#4a9a4a" : "#e85555", border: `1px solid ${r.timePaid ? "#4a9a4a" : "#9a3a3a"}`, borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                      {r.timePaid ? "Undo" : "Mark Paid"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
          {Object.keys(records).filter(k => records[k].length > 0).length === 0 && (
            <div style={{ textAlign: "center", color: "#444", marginTop: 60, fontSize: 14 }}>No records yet.</div>
          )}
        </div>
      )}

      {/* TEACHERS VIEW */}
      {view === "teachers" && (
        <div style={{ padding: "24px 16px" }}>
          <div style={{ fontSize: 16, color: "#c9a84c", marginBottom: 16, fontWeight: "bold" }}>Teacher Summary</div>
          {isAdmin && (
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <input value={newTeacher} onChange={e => setNewTeacher(e.target.value)} onKeyDown={e => e.key === "Enter" && addTeacher()} placeholder="Add new teacher name..." style={{ flex: 1, background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: 8, color: "#e0d8c8", padding: "10px 12px", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
              <button onClick={addTeacher} style={{ background: "#c9a84c", color: "#0f1117", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: "bold", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>Add</button>
            </div>
          )}
          {teachers.map(t => {
            const s = teacherStats[t] || { late: 0, paid: 0, unpaid: 0 };
            return (
              <div key={t} style={{ background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 14, color: "#e0d8c8", fontWeight: "bold" }}>{t}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, background: "#2a1e1e", color: "#e85555", padding: "2px 8px", borderRadius: 20 }}>{s.late} late</span>
                      <span style={{ fontSize: 11, background: "#1a2e1a", color: "#4a9a4a", padding: "2px 8px", borderRadius: 20 }}>₦{s.paid * FINE_AMOUNT} paid</span>
                      {s.unpaid > 0 && <span style={{ fontSize: 11, background: "#2e2a1a", color: "#c9a84c", padding: "2px 8px", borderRadius: 20 }}>₦{s.unpaid * FINE_AMOUNT} owed</span>}
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => removeTeacher(t)} style={{ background: "transparent", color: "#444", border: "1px solid #2a2f3e", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>✕</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MARK LATE MODAL */}
      {modalOpen && selectedDate && isAdmin && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", zIndex: 100 }} onClick={() => setModalOpen(false)}>
          <div style={{ background: "#1a1f2e", borderRadius: "20px 20px 0 0", border: "1px solid #2a2f3e", borderBottom: "none", padding: "20px 16px 32px", width: "100%", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#c9a84c" }}>Mark Late Teachers</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                {new Date(selectedDate.key + "T12:00:00").toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              {teachers.map(t => {
                const selected = selectedTeachersForDate.includes(t);
                return (
                  <div key={t} onClick={() => setSelectedTeachersForDate(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, marginBottom: 6, background: selected ? "#2e1a1a" : "#141820", border: selected ? "1px solid #9a3a3a" : "1px solid #1e2230", cursor: "pointer" }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: selected ? "#e85555" : "transparent", border: selected ? "2px solid #e85555" : "2px solid #444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {selected && <span style={{ color: "white", fontSize: 12, lineHeight: 1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 14, color: selected ? "#e8a0a0" : "#888" }}>{t}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setModalOpen(false)} style={{ flex: 1, background: "transparent", color: "#888", border: "1px solid #2a2f3e", borderRadius: 10, padding: 14, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={saveLateness} style={{ flex: 2, background: "linear-gradient(135deg, #c9a84c, #8b6914)", color: "#0f1117", border: "none", borderRadius: 10, padding: 14, fontSize: 14, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>
                Save ({selectedTeachersForDate.length} selected)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "#1a1f2e", border: "1px solid #c9a84c", borderRadius: 16, padding: 24, width: "85%", maxWidth: 320 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>🔐</div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#c9a84c" }}>Admin Login</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Enter your password to continue</div>
            </div>
            <input
              type="password"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Enter password..."
              style={{ width: "100%", background: "#0f1117", border: "1px solid #2a2f3e", borderRadius: 8, color: "#e0d8c8", padding: "12px", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 8 }}
            />
            {loginError && <div style={{ color: "#e85555", fontSize: 12, marginBottom: 8, textAlign: "center" }}>{loginError}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => setShowLoginModal(false)} style={{ flex: 1, background: "transparent", color: "#888", border: "1px solid #2a2f3e", borderRadius: 8, padding: 12, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Cancel</button>
              <button onClick={handleLogin} style={{ flex: 2, background: "linear-gradient(135deg, #c9a84c, #8b6914)", color: "#0f1117", border: "none", borderRadius: 8, padding: 12, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Login</button>
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
