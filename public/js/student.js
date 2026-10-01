let currentUser = null;
let currentStudent = null;
let currentResults = [];

(async function init() {
  currentUser = await requireRole("student");
  if (!currentUser) return;
  renderTopbar("topbar", "Student");
  renderFooter("footer");
  setupTabs();
  await Promise.all([loadProfile(), loadResults(), loadAttendance(), loadAcademic(), loadNotices()]);
  document.getElementById("downloadBtn").addEventListener("click", downloadResultPdf);
})();

async function loadProfile() {
  const { student } = await api("/students/mine");
  currentStudent = student;
  profile.innerHTML = `
    <div class="profile-head">${student.photo ? `<img src="${student.photo}" class="profile-photo" alt="Student photo">` : `<div class="profile-photo placeholder">No Photo</div>`}<div><h2>${student.name}</h2><p class="muted">Admission No. ${student.admissionNo}</p></div></div>
    <div class="profile-grid">
      <p><strong>Name</strong><br>${student.name}</p>
      <p><strong>Admission No.</strong><br>${student.admissionNo}</p>
      <p><strong>Class</strong><br>${student.className} ${student.section || ""}</p>
      <p><strong>Admission Year</strong><br>${student.admissionYear}</p>
      <p><strong>Date of Birth</strong><br>${student.dob || "—"}</p>
      <p><strong>Parent</strong><br>${student.parentName || "—"}</p>
    </div>`;
}

async function loadResults() {
  const { results } = await api("/results/mine");
  currentResults = results;
  const groups={}; results.forEach(r=>{const key=`${r.term||""}|||${r.examName}`;(groups[key] ||= {term:r.term||"",exam:r.examName,rows:[]}).rows.push(r);});
  const rows=Object.values(groups).map(g=>{const total=g.rows.reduce((a,r)=>a+Number(r.obtained),0),max=g.rows.reduce((a,r)=>a+Number(r.maxMarks),0),pct=max?total/max*100:0;return `<tr><td>${g.term||"-"}</td><td>${g.exam}</td><td>${g.rows.map(r=>`${r.subject}: ${r.obtained}/${r.maxMarks}`).join('<br>')}</td><td>${total}/${max}</td><td>${pct.toFixed(1)}%</td><td>${pct>=90?'A+':pct>=80?'A':pct>=70?'B':pct>=60?'C':pct>=50?'D':'E'}</td></tr>`}).join('');
  resultsTable.querySelector("tbody").innerHTML=rows||`<tr><td colspan="6">No results posted yet.</td></tr>`;
}

async function loadAttendance() {
  const { records } = await api("/attendance/mine");
  attendanceTable.querySelector("tbody").innerHTML = records.slice().sort((a, b) => b.date.localeCompare(a.date)).map(r => `
    <tr><td>${r.date}</td><td><span class="badge ${r.status.toLowerCase()}">${r.status}</span></td></tr>`).join("") || `<tr><td colspan="2">No attendance records yet.</td></tr>`;
}

async function loadAcademic() {
  const [tt, hol, ct] = await Promise.all([
    api("/school/timetable"),
    api("/school/holidays"),
    api("/school/content")
  ]);

  ttTable.querySelector("tbody").innerHTML = tt.timetable
    .sort((a, b) => (a.day + a.startTime).localeCompare(b.day + b.startTime))
    .map(x => `<tr><td>${x.day}</td><td>${x.startTime}–${x.endTime}</td><td>${x.subjectName}</td><td>${x.room || ""}</td></tr>`)
    .join("") || `<tr><td colspan="4">No timetable published.</td></tr>`;

  holidayList.innerHTML = hol.holidays.map(h => `
    <div class="notif-card"><strong>${h.title}</strong><br>${h.date}${h.description ? `<br>${h.description}` : ""}</div>`
  ).join("") || `<p>No holidays published.</p>`;

  subjectList.innerHTML = ct.content.map(c => `
    <div class="card" style="margin-bottom:12px">
      <span class="badge new">${c.subjectName}</span>
      <h3>${c.title}</h3>
      <p>${c.body}</p>
      <small class="muted">Posted by ${c.postedBy} · ${fmtDate(c.createdAt)}</small>
    </div>`).join("") || `<div class="card"><p>No subject updates yet.</p></div>`;
}

async function loadNotices() {
  const { notifications } = await api("/notifications/mine");
  noticesList.innerHTML = notifications.map(n => `
    <div class="notif-card ${n.studentSeen ? "" : "unread"}">
      <strong>${n.title}</strong> ${n.studentSeen ? "" : "<span class=\"badge new\">NEW</span>"}<br>
      ${n.message}<br>
      <small>${fmtDate(n.createdAt)}</small>
    </div>`).join("") || `<p>No notices yet.</p>`;

  notifications.filter(n => !n.studentSeen).forEach(n =>
    api(`/notifications/${n.id}/seen`, { method: "POST" }).catch(() => {})
  );
}

function downloadResultPdf() {
  if (!currentResults.length) {
    alert("No results to download yet.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Golden Star International School", 105, 18, { align: "center" });
  doc.setFontSize(11);
  doc.text("Student Result Sheet", 105, 28, { align: "center" });
  doc.text(`Name: ${currentStudent.name}`, 14, 42);
  doc.text(`Admission No: ${currentStudent.admissionNo}`, 14, 49);

  let y = 62;
  doc.text("Term", 14, y); doc.text("Exam", 45, y); doc.text("Subject", 82, y); doc.text("Marks", 145, y); y += 8;
  const groups={}; currentResults.forEach(r=>{const key=`${r.term||""}|||${r.examName}`;(groups[key] ||= {term:r.term||"",exam:r.examName,rows:[]}).rows.push(r);});
  let total=0,max=0;
  Object.values(groups).forEach(g=>{doc.setFont(undefined,"bold");doc.text(`${g.term||"-"} - ${g.exam}`,14,y);y+=7;doc.setFont(undefined,"normal");g.rows.forEach(r=>{doc.text(String(r.subject),18,y);doc.text(`${r.obtained}/${r.maxMarks}`,145,y);total+=Number(r.obtained);max+=Number(r.maxMarks);y+=7;});y+=2;if(y>270){doc.addPage();y=20;}});
  if (currentStudent.photo) { try { doc.addImage(currentStudent.photo, "JPEG", 165, 34, 28, 34); } catch(e) {} }
  doc.text(`Total: ${total}/${max} (${max ? ((total / max) * 100).toFixed(1) : 0}%)`, 14, y + 8);
  doc.save(`${currentStudent.admissionNo}_result.pdf`);
}
