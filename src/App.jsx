import { useState, useMemo, useEffect } from "react";

const TEACHERS = ["Mr. Victor", "Mr. Paul", "Mr. Toyosi", "Mrs. Cynthia"];

const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const FINE_AMOUNT = 200;
const ADMIN_PASSWORD = "Olufunke1";

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDay(year, month) { return new Date(year, month, 1).getDay(); }
function isWeekend(year, month, day) { const d = new Date(year, month, day).getDay(); return d === 0 || d === 6; }

async function callClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await res.json();
  return data.content?.[0]?.text || "Could not generate response.";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeachersForDate, setSelectedTeachersForDate] = useState([]);
  const [newTeacher, setNewTeacher] = useState("");
  const [aiModal, setAiModal] = useState(null); // { type: 'report' | 'whatsapp', teacher? }
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [reportMonth, setReportMonth] = useState(today.getMonth());
  const [reportYear, setReportYear] = useState(today.getFullYear());

  const [records, setRecords] = useState(() => {
    try { const s = localStorage.getItem("fmc_records"); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [teachers, setTeachers] = useState(() => {
    try { const s = localStorage.getItem("fmc_teachers"); return s ? JSON.parse(s) : TEACHERS; } catch { return TEACHERS; }
  });

  useEffect(() => { try { localStorage.setItem("fmc_records", JSON.stringify(records)); } catch {} }, [records]);
  useEffect(() => { try { localStorage.setItem("fmc_teachers", JSON.stringify(teachers)); } catch {} }, [teachers]);

  const handleAdminTap = () => {
    const n = adminTapCount + 1; setAdminTapCount(n);
    if (n >= 3) { setAdminTapCount(0); setShowLoginModal(true); setPasswordInput(""); setLoginError(""); }
  };
  const handleLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) { setIsAdmin(true); setShowLoginModal(false); setLoginError(""); }
    else setLoginError("Incorrect password. Try again.");
  };
  const handleLogout = () => setIsAdmin(false);

  const dateKey = (y, m, d) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const lateOnDate = (key) => records[key] || [];
  const markedDays = useMemo(() => { const s = new Set(); Object.keys(records).forEach(k => { if (records[k].length > 0) s.add(k); }); return s; }, [records]);

  const openDateModal = (day) => {
    if (!isAdmin || isWeekend(currentYear, currentMonth, day)) return;
    const key = dateKey(currentYear, currentMonth, day);
    setSelectedDate({ day, key });
    setSelectedTeachersForDate((records[key] || []).map(r => r.teacher));
    setModalOpen(true);
  };
  const saveLateness = () => {
    const em = {}; (records[selectedDate.key] || []).forEach(r => em[r.teacher] = r);
    setRecords(prev => ({ ...prev, [selectedDate.key]: selectedTeachersForDate.map(t => em[t] || { teacher: t, timePaid: null }) }));
    setModalOpen(false);
  };
  const togglePaid = (dk, teacher) => {
    if (!isAdmin) return;
    setRecords(prev => {
      const list = [...(prev[dk] || [])];
      const i = list.findIndex(r => r.teacher === teacher);
      if (i >= 0) list[i] = { ...list[i], timePaid: list[i].timePaid ? null : new Date().toLocaleTimeString() };
      return { ...prev, [dk]: list };
    });
  };
  const addTeacher = () => { if (!isAdmin) return; const n = newTeacher.trim(); if (n && !teachers.includes(n)) { setTeachers(p => [...p, n]); setNewTeacher(""); } };
  const removeTeacher = (n) => { if (isAdmin) setTeachers(p => p.filter(t => t !== n)); };

  const allRecords = useMemo(() => { const f = []; Object.entries(records).forEach(([date, list]) => list.forEach(r => f.push({ date, ...r }))); return f; }, [records]);
  const teacherStats = useMemo(() => {
    const s = {}; teachers.forEach(t => s[t] = { late: 0, paid: 0, unpaid: 0 });
    allRecords.forEach(r => { if (!s[r.teacher]) s[r.teacher] = { late: 0, paid: 0, unpaid: 0 }; s[r.teacher].late++; if (r.timePaid) s[r.teacher].paid++; else s[r.teacher].unpaid++; });
    return s;
  }, [allRecords, teachers]);

  // Get stats for a specific month
  const getMonthStats = (month, year) => {
    const monthKey = `${year}-${String(month+1).padStart(2,"0")}`;
    const monthRecords = Object.entries(records).filter(([k]) => k.startsWith(monthKey));
    const stats = {};
    teachers.forEach(t => stats[t] = { late: 0, paid: 0, unpaid: 0, dates: [] });
    monthRecords.forEach(([date, list]) => {
      list.forEach(r => {
        if (!stats[r.teacher]) stats[r.teacher] = { late: 0, paid: 0, unpaid: 0, dates: [] };
        stats[r.teacher].late++;
        stats[r.teacher].dates.push(date);
        if (r.timePaid) stats[r.teacher].paid++;
        else stats[r.teacher].unpaid++;
      });
    });
    return stats;
  };

  const generateMonthlyReport = async () => {
    setAiLoading(true);
    setAiResult("");
    const stats = getMonthStats(reportMonth, reportYear);
    const monthName = MONTHS[reportMonth];
    const summary = teachers.map(t => {
      const s = stats[t] || { late: 0, paid: 0, unpaid: 0 };
      return `${t}: ${s.late} late arrival(s), ₦${s.paid * FINE_AMOUNT} paid, ₦${s.unpaid * FINE_AMOUNT} still owed`;
    }).join("\n");

    const prompt = `You are the vice principal of Frontmark College in Lagos, Nigeria. Write a formal monthly punctuality report for ${monthName} ${reportYear} based on this staff lateness data:\n\n${summary}\n\nTotal fine per late arrival: ₦${FINE_AMOUNT}\n\nWrite a professional report with: a header, summary of findings, individual staff breakdown, total fines collected vs outstanding, and a closing recommendation. Keep it concise and formal.`;

    const result = await callClaude(prompt);
    setAiResult(result);
    setAiLoading(false);
  };

  const generateWhatsApp = async (teacher) => {
    setAiLoading(true);
    setAiResult("");
    const s = teacherStats[teacher] || { late: 0, paid: 0, unpaid: 0 };
    const prompt = `Write a short, professional but friendly WhatsApp message from a school administrator to a teacher named ${teacher} at Frontmark College Lagos. The message is about their punctuality fine. Details: they have been late ${s.late} time(s) this term, have paid ₦${s.paid * FINE_AMOUNT}, and still owe ₦${s.unpaid * FINE_AMOUNT} in fines (₦${FINE_AMOUNT} per late arrival). Keep it under 100 words, respectful, and end with a polite reminder to pay any outstanding fine. Start with "Dear ${teacher},"`;

    const result = await callClaude(prompt);
    setAiResult(result);
    setAiLoading(false);
  };

  const openAiModal = (type, teacher = null) => {
    setAiModal({ type, teacher });
    setAiResult("");
    if (type === "whatsapp" && teacher) generateWhatsApp(teacher);
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDay(currentYear, currentMonth);
  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y-1); } else setCurrentMonth(m => m-1); };
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y+1); } else setCurrentMonth(m => m+1); };

  return (
    <div style={{ minHeight:"100vh", background:"#0f1117", fontFamily:"'Georgia','Times New Roman',serif", color:"#e8e0d0", padding:"0 0 60px" }}>

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#1a1f2e,#0f1117)", borderBottom:"2px solid #c9a84c", padding:"20px 24px 0" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
          <div onClick={handleAdminTap} style={{ width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg,#c9a84c,#8b6914)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, cursor:"pointer" }}>⏰</div>
          <div>
            <div style={{ fontSize:20, fontWeight:"bold", color:"#c9a84c", letterSpacing:1 }}>Frontmark College</div>
            <div style={{ fontSize:11, color:"#888", letterSpacing:2, textTransform:"uppercase" }}>Staff Punctuality Tracker</div>
          </div>
          <div style={{ marginLeft:"auto", textAlign:"right" }}>
            {isAdmin ? <div><div style={{ fontSize:11, color:"#4a9a4a", marginBottom:2 }}>🔓 Admin</div><button onClick={handleLogout} style={{ fontSize:10, background:"transparent", color:"#888", border:"1px solid #444", borderRadius:4, padding:"2px 6px", cursor:"pointer", fontFamily:"inherit" }}>Logout</button></div>
            : <div><div style={{ fontSize:12, color:"#c9a84c" }}>Fine: ₦{FINE_AMOUNT}</div><div style={{ fontSize:10, color:"#555" }}>👁 View only</div></div>}
          </div>
        </div>
        <div style={{ display:"flex", gap:0, marginTop:8 }}>
          {[["calendar","📅 Calendar"],["records","📋 Records"],["teachers","👨‍🏫 Teachers"],["ai","🤖 AI Tools"]].map(([v,label]) => (
            <button key={v} onClick={() => setView(v)} style={{ background:view===v?"#c9a84c":"transparent", color:view===v?"#0f1117":"#888", border:"none", padding:"8px 12px", cursor:"pointer", fontSize:12, fontWeight:view===v?"bold":"normal", borderRadius:"6px 6px 0 0", fontFamily:"inherit" }}>{label}</button>
          ))}
        </div>
      </div>

      {!isAdmin && <div style={{ background:"#1a1f2e", borderBottom:"1px solid #2a2f3e", padding:"8px 16px", textAlign:"center", fontSize:11, color:"#666" }}>👁 View only mode. Tap ⏰ icon 3 times to log in as admin.</div>}

      {/* CALENDAR */}
      {view === "calendar" && (
        <div style={{ padding:"24px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
            <button onClick={prevMonth} style={nb}>‹</button>
            <div style={{ textAlign:"center" }}><div style={{ fontSize:22, color:"#c9a84c", fontWeight:"bold" }}>{MONTHS[currentMonth]}</div><div style={{ fontSize:13, color:"#666" }}>{currentYear}</div></div>
            <button onClick={nextMonth} style={nb}>›</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:6 }}>
            {DAYS.map(d => <div key={d} style={{ textAlign:"center", fontSize:11, color:d==="Sun"||d==="Sat"?"#444":"#888", padding:"4px 0" }}>{d}</div>)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
            {Array.from({ length:firstDay }).map((_,i) => <div key={"e"+i} />)}
            {Array.from({ length:daysInMonth },(_,i) => i+1).map(day => {
              const key = dateKey(currentYear,currentMonth,day);
              const isToday = today.getFullYear()===currentYear && today.getMonth()===currentMonth && today.getDate()===day;
              const lateList = lateOnDate(key); const hasLate = markedDays.has(key);
              const allPaid = lateList.length>0 && lateList.every(r => r.timePaid);
              const somePaid = lateList.some(r => r.timePaid) && !allPaid;
              const weekend = isWeekend(currentYear,currentMonth,day);
              return (
                <div key={day} onClick={() => !weekend && openDateModal(day)} style={{ background:isToday?"#1e2a3a":hasLate?(allPaid?"#1a2e1a":somePaid?"#2a2a1a":"#2e1a1a"):"#1a1f2e", border:isToday?"1.5px solid #c9a84c":hasLate?(allPaid?"1px solid #4a9a4a":"1px solid #9a3a3a"):"1px solid #2a2f3e", borderRadius:8, padding:"8px 4px", cursor:isAdmin&&!weekend?"pointer":"default", opacity:weekend?0.3:1, minHeight:56 }}>
                  <div style={{ fontSize:14, textAlign:"center", color:isToday?"#c9a84c":"#d0c8b8", fontWeight:isToday?"bold":"normal" }}>{day}</div>
                  {hasLate && <div style={{ textAlign:"center", marginTop:2 }}><div style={{ fontSize:10, color:allPaid?"#4a9a4a":"#e85555" }}>{lateList.length} late</div>{allPaid&&<div style={{ fontSize:9, color:"#4a9a4a" }}>✓ paid</div>}{somePaid&&<div style={{ fontSize:9, color:"#c9a84c" }}>partial</div>}</div>}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:24, display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
            {[["📌",allRecords.length,"Total Late"],["💸",allRecords.filter(r=>!r.timePaid).length,"Unpaid"],["✅",allRecords.filter(r=>r.timePaid).length,"Paid"]].map(([icon,val,label]) => (
              <div key={label} style={{ background:"#1a1f2e", border:"1px solid #2a2f3e", borderRadius:10, padding:"14px 8px", textAlign:"center" }}>
                <div style={{ fontSize:20 }}>{icon}</div><div style={{ fontSize:22, fontWeight:"bold", color:"#c9a84c" }}>{val}</div>
                <div style={{ fontSize:11, color:"#666" }}>{label}</div>
                {label!=="Total Late"&&<div style={{ fontSize:11, color:"#888" }}>₦{val*FINE_AMOUNT}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECORDS */}
      {view === "records" && (
        <div style={{ padding:"24px 16px" }}>
          <div style={{ fontSize:16, color:"#c9a84c", marginBottom:16, fontWeight:"bold" }}>All Lateness Records</div>
          {Object.keys(records).filter(k=>records[k].length>0).sort().reverse().map(dk => (
            <div key={dk} style={{ background:"#1a1f2e", border:"1px solid #2a2f3e", borderRadius:10, marginBottom:12, overflow:"hidden" }}>
              <div style={{ background:"#1e2640", padding:"10px 14px", borderBottom:"1px solid #2a2f3e", display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"#c9a84c", fontSize:13, fontWeight:"bold" }}>📅 {new Date(dk+"T12:00:00").toLocaleDateString("en-NG",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</span>
                <span style={{ fontSize:11, color:"#888" }}>{records[dk].length} teacher{records[dk].length!==1?"s":""}</span>
              </div>
              {records[dk].map(r => (
                <div key={r.teacher} style={{ padding:"10px 14px", borderBottom:"1px solid #1e2230", display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:"#e0d8c8" }}>{r.teacher}</div>
                    <div style={{ fontSize:11, color:r.timePaid?"#4a9a4a":"#e85555" }}>{r.timePaid?"✅ Paid ₦"+FINE_AMOUNT+" at "+r.timePaid:"⚠️ Fine pending: ₦"+FINE_AMOUNT}</div>
                  </div>
                  {isAdmin && <button onClick={() => togglePaid(dk,r.teacher)} style={{ background:r.timePaid?"#1a2e1a":"#2e1a1a", color:r.timePaid?"#4a9a4a":"#e85555", border:"1px solid "+(r.timePaid?"#4a9a4a":"#9a3a3a"), borderRadius:6, padding:"5px 10px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>{r.timePaid?"Undo":"Mark Paid"}</button>}
                </div>
              ))}
            </div>
          ))}
          {Object.keys(records).filter(k=>records[k].length>0).length===0 && <div style={{ textAlign:"center", color:"#444", marginTop:60, fontSize:14 }}>No records yet.</div>}
        </div>
      )}

      {/* TEACHERS */}
      {view === "teachers" && (
        <div style={{ padding:"24px 16px" }}>
          <div style={{ fontSize:16, color:"#c9a84c", marginBottom:16, fontWeight:"bold" }}>Teacher Summary</div>
          {isAdmin && (
            <div style={{ display:"flex", gap:8, marginBottom:20 }}>
              <input value={newTeacher} onChange={e=>setNewTeacher(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTeacher()} placeholder="Add new teacher name..." style={{ flex:1, background:"#1a1f2e", border:"1px solid #2a2f3e", borderRadius:8, color:"#e0d8c8", padding:"10px 12px", fontSize:13, fontFamily:"inherit", outline:"none" }} />
              <button onClick={addTeacher} style={{ background:"#c9a84c", color:"#0f1117", border:"none", borderRadius:8, padding:"10px 16px", fontWeight:"bold", cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>Add</button>
            </div>
          )}
          {teachers.map(t => {
            const s = teacherStats[t]||{late:0,paid:0,unpaid:0};
            return (
              <div key={t} style={{ background:"#1a1f2e", border:"1px solid #2a2f3e", borderRadius:10, padding:"12px 14px", marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, color:"#e0d8c8", fontWeight:"bold" }}>{t}</div>
                    <div style={{ marginTop:6, display:"flex", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontSize:11, background:"#2a1e1e", color:"#e85555", padding:"2px 8px", borderRadius:20 }}>{s.late} late</span>
                      <span style={{ fontSize:11, background:"#1a2e1a", color:"#4a9a4a", padding:"2px 8px", borderRadius:20 }}>₦{s.paid*FINE_AMOUNT} paid</span>
                      {s.unpaid>0&&<span style={{ fontSize:11, background:"#2e2a1a", color:"#c9a84c", padding:"2px 8px", borderRadius:20 }}>₦{s.unpaid*FINE_AMOUNT} owed</span>}
                    </div>
                    {isAdmin && (
                      <button onClick={() => openAiModal("whatsapp", t)} style={{ marginTop:8, background:"#1a2640", color:"#4a9a4a", border:"1px solid #2a4a2a", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
                        📱 Generate WhatsApp Message
                      </button>
                    )}
                  </div>
                  {isAdmin&&<button onClick={()=>removeTeacher(t)} style={{ background:"transparent", color:"#444", border:"1px solid #2a2f3e", borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>✕</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI TOOLS */}
      {view === "ai" && (
        <div style={{ padding:"24px 16px" }}>
          <div style={{ fontSize:16, color:"#c9a84c", marginBottom:6, fontWeight:"bold" }}>🤖 AI Tools</div>
          <div style={{ fontSize:12, color:"#666", marginBottom:20 }}>Powered by Claude AI</div>

          {/* Monthly Report */}
          <div style={{ background:"#1a1f2e", border:"1px solid #2a2f3e", borderRadius:12, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:14, color:"#c9a84c", fontWeight:"bold", marginBottom:4 }}>📊 Monthly Punctuality Report</div>
            <div style={{ fontSize:12, color:"#888", marginBottom:12 }}>Generate a formal report for any month</div>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <select value={reportMonth} onChange={e=>setReportMonth(Number(e.target.value))} style={{ flex:1, background:"#0f1117", border:"1px solid #2a2f3e", borderRadius:8, color:"#e0d8c8", padding:"8px", fontSize:13, fontFamily:"inherit" }}>
                {MONTHS.map((m,i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select value={reportYear} onChange={e=>setReportYear(Number(e.target.value))} style={{ width:90, background:"#0f1117", border:"1px solid #2a2f3e", borderRadius:8, color:"#e0d8c8", padding:"8px", fontSize:13, fontFamily:"inherit" }}>
                {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={generateMonthlyReport} disabled={aiLoading} style={{ width:"100%", background:"linear-gradient(135deg,#c9a84c,#8b6914)", color:"#0f1117", border:"none", borderRadius:8, padding:"12px", fontWeight:"bold", cursor:"pointer", fontSize:14, fontFamily:"inherit", opacity:aiLoading?0.7:1 }}>
              {aiLoading?"Generating...":"Generate Report"}
            </button>
            {aiResult && aiModal?.type !== "whatsapp" && (
              <div style={{ marginTop:12, background:"#0f1117", border:"1px solid #2a2f3e", borderRadius:8, padding:12 }}>
                <div style={{ fontSize:12, color:"#e0d8c8", lineHeight:1.6, whiteSpace:"pre-wrap" }}>{aiResult}</div>
                <button onClick={() => { navigator.clipboard?.writeText(aiResult); }} style={{ marginTop:8, background:"transparent", color:"#c9a84c", border:"1px solid #c9a84c", borderRadius:6, padding:"6px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>📋 Copy</button>
              </div>
            )}
          </div>

          {/* WhatsApp per teacher */}
          <div style={{ background:"#1a1f2e", border:"1px solid #2a2f3e", borderRadius:12, padding:16 }}>
            <div style={{ fontSize:14, color:"#c9a84c", fontWeight:"bold", marginBottom:4 }}>📱 WhatsApp Message Generator</div>
            <div style={{ fontSize:12, color:"#888", marginBottom:12 }}>Generate a message for a specific teacher</div>
            {teachers.map(t => (
              <button key={t} onClick={() => { setAiModal({type:"whatsapp",teacher:t}); generateWhatsApp(t); }} style={{ width:"100%", background:"#141820", border:"1px solid #2a2f3e", borderRadius:8, padding:"10px 14px", marginBottom:8, textAlign:"left", cursor:"pointer", fontFamily:"inherit", color:"#e0d8c8", fontSize:13, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span>{t}</span><span style={{ color:"#4a9a4a", fontSize:11 }}>Generate →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MARK LATE MODAL */}
      {modalOpen&&selectedDate&&isAdmin&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"flex-end", zIndex:100 }} onClick={()=>setModalOpen(false)}>
          <div style={{ background:"#1a1f2e", borderRadius:"20px 20px 0 0", border:"1px solid #2a2f3e", borderBottom:"none", padding:"20px 16px 32px", width:"100%", maxHeight:"80vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ textAlign:"center", marginBottom:16 }}>
              <div style={{ fontSize:16, fontWeight:"bold", color:"#c9a84c" }}>Mark Late Teachers</div>
              <div style={{ fontSize:12, color:"#666", marginTop:2 }}>{new Date(selectedDate.key+"T12:00:00").toLocaleDateString("en-NG",{weekday:"long",day:"numeric",month:"long"})}</div>
            </div>
            <div style={{ marginBottom:16 }}>
              {teachers.map(t => {
                const sel = selectedTeachersForDate.includes(t);
                return <div key={t} onClick={()=>setSelectedTeachersForDate(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t])} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:8, marginBottom:6, background:sel?"#2e1a1a":"#141820", border:sel?"1px solid #9a3a3a":"1px solid #1e2230", cursor:"pointer" }}>
                  <div style={{ width:20, height:20, borderRadius:4, background:sel?"#e85555":"transparent", border:sel?"2px solid #e85555":"2px solid #444", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{sel&&<span style={{ color:"white", fontSize:12 }}>✓</span>}</div>
                  <span style={{ fontSize:14, color:sel?"#e8a0a0":"#888" }}>{t}</span>
                </div>;
              })}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setModalOpen(false)} style={{ flex:1, background:"transparent", color:"#888", border:"1px solid #2a2f3e", borderRadius:10, padding:14, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
              <button onClick={saveLateness} style={{ flex:2, background:"linear-gradient(135deg,#c9a84c,#8b6914)", color:"#0f1117", border:"none", borderRadius:10, padding:14, fontSize:14, fontWeight:"bold", cursor:"pointer", fontFamily:"inherit" }}>Save ({selectedTeachersForDate.length} selected)</button>
            </div>
          </div>
        </div>
      )}

      {/* AI RESULT MODAL (WhatsApp) */}
      {aiModal?.type === "whatsapp" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", display:"flex", alignItems:"flex-end", zIndex:150 }} onClick={()=>setAiModal(null)}>
          <div style={{ background:"#1a1f2e", borderRadius:"20px 20px 0 0", border:"1px solid #2a2f3e", borderBottom:"none", padding:"20px 16px 32px", width:"100%", maxHeight:"80vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ textAlign:"center", marginBottom:16 }}>
              <div style={{ fontSize:16, fontWeight:"bold", color:"#c9a84c" }}>📱 WhatsApp Message</div>
              <div style={{ fontSize:12, color:"#666", marginTop:2 }}>For {aiModal.teacher}</div>
            </div>
            {aiLoading ? (
              <div style={{ textAlign:"center", padding:40, color:"#666" }}>✨ Generating message...</div>
            ) : (
              <>
                <div style={{ background:"#0f1117", border:"1px solid #2a2f3e", borderRadius:8, padding:14, marginBottom:12 }}>
                  <div style={{ fontSize:13, color:"#e0d8c8", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{aiResult}</div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>setAiModal(null)} style={{ flex:1, background:"transparent", color:"#888", border:"1px solid #2a2f3e", borderRadius:10, padding:12, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Close</button>
                  <button onClick={() => { navigator.clipboard?.writeText(aiResult); }} style={{ flex:2, background:"linear-gradient(135deg,#25d366,#128c7e)", color:"white", border:"none", borderRadius:10, padding:12, fontSize:13, fontWeight:"bold", cursor:"pointer", fontFamily:"inherit" }}>📋 Copy to WhatsApp</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* LOGIN MODAL */}
      {showLoginModal&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <div style={{ background:"#1a1f2e", border:"1px solid #c9a84c", borderRadius:16, padding:24, width:"85%", maxWidth:320 }}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:30, marginBottom:8 }}>🔐</div>
              <div style={{ fontSize:16, fontWeight:"bold", color:"#c9a84c" }}>Admin Login</div>
              <div style={{ fontSize:12, color:"#666", marginTop:4 }}>Enter your password to continue</div>
            </div>
            <input type="password" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Enter password..." style={{ width:"100%", background:"#0f1117", border:"1px solid #2a2f3e", borderRadius:8, color:"#e0d8c8", padding:"12px", fontSize:14, fontFamily:"inherit", outline:"none", boxSizing:"border-box", marginBottom:8 }} />
            {loginError&&<div style={{ color:"#e85555", fontSize:12, marginBottom:8, textAlign:"center" }}>{loginError}</div>}
            <div style={{ display:"flex", gap:8, marginTop:8 }}>
              <button onClick={()=>setShowLoginModal(false)} style={{ flex:1, background:"transparent", color:"#888", border:"1px solid #2a2f3e", borderRadius:8, padding:12, cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>Cancel</button>
              <button onClick={handleLogin} style={{ flex:2, background:"linear-gradient(135deg,#c9a84c,#8b6914)", color:"#0f1117", border:"none", borderRadius:8, padding:12, fontWeight:"bold", cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>Login</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const nb = { background:"#1a1f2e", border:"1px solid #2a2f3e", color:"#c9a84c", borderRadius:8, width:38, height:38, fontSize:20, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" };
