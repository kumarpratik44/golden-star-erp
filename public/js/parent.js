(async function init() {
  const user = await requireRole("parent");
  if (!user) return;
  renderTopbar("topbar", "Parent");
  renderFooter("footer");
  setupTabs();
  await Promise.all([loadChild(), loadResults(), loadAttendance(), loadAcademic(), loadNotices()]);
})();

async function loadChild() {
  const { student } = await api("/students/parent");
  childProfile.innerHTML = `
    <div class="profile-head">${student.photo ? `<img src="${student.photo}" class="profile-photo" alt="Student photo">` : `<div class="profile-photo placeholder">No Photo</div>`}<div><h2>${student.name}</h2><p class="muted">Admission No. ${student.admissionNo}</p></div></div>
    <div class="profile-grid">
      <p><strong>Student</strong><br>${student.name}</p>
      <p><strong>Admission No.</strong><br>${student.admissionNo}</p>
      <p><strong>Class</strong><br>${student.className} ${student.section || ""}</p>
      <p><strong>Admission Year</strong><br>${student.admissionYear}</p>
      <p><strong>Date of Birth</strong><br>${student.dob || "—"}</p>
      <p><strong>Parent</strong><br>${student.parentName || "—"}</p>
    </div>`;
}

async function loadResults() {
  const { results } = await api("/results/parent");
  const groups={}; results.forEach(r=>{const key=`${r.term||""}|||${r.examName}`;(groups[key] ||= {term:r.term||"",exam:r.examName,rows:[]}).rows.push(r);});
  const rows=Object.values(groups).map(g=>{const total=g.rows.reduce((a,r)=>a+Number(r.obtained),0),max=g.rows.reduce((a,r)=>a+Number(r.maxMarks),0),pct=max?total/max*100:0;return `<tr><td>${g.term||"-"}</td><td>${g.exam}</td><td>${g.rows.map(r=>`${r.subject}: ${r.obtained}/${r.maxMarks}`).join('<br>')}</td><td>${total}/${max}</td><td>${pct.toFixed(1)}%</td><td>${pct>=90?'A+':pct>=80?'A':pct>=70?'B':pct>=60?'C':pct>=50?'D':'E'}</td></tr>`}).join('');
  resultsTable.querySelector("tbody").innerHTML=rows||`<tr><td colspan="6">No results yet.</td></tr>`;
}

async function loadAttendance() {
  const { records } = await api("/attendance/parent");
  attendanceTable.querySelector("tbody").innerHTML = records.slice().sort((a, b) => b.date.localeCompare(a.date)).map(r => `
    <tr><td>${r.date}</td><td><span class="badge ${r.status.toLowerCase()}">${r.status}</span></td></tr>`).join("") || `<tr><td colspan="2">No records yet.</td></tr>`;
}

async function loadAcademic() {
  const [tt, hol] = await Promise.all([api("/school/timetable"), api("/school/holidays")]);

  ttTable.querySelector("tbody").innerHTML = tt.timetable.map(x => `
    <tr><td>${x.day}</td><td>${x.startTime}–${x.endTime}</td><td>${x.subjectName}</td><td>${x.room || ""}</td></tr>`
  ).join("") || `<tr><td colspan="4">No timetable published.</td></tr>`;

  holidayList.innerHTML = hol.holidays.map(h => `
    <div class="notif-card"><strong>${h.title}</strong><br>${h.date}${h.description ? `<br>${h.description}` : ""}</div>`
  ).join("") || `<p>No holidays published.</p>`;
}

async function loadNotices() {
  const { notifications } = await api("/notifications/parent");
  noticesList.innerHTML = notifications.map(n => `
    <div class="notif-card ${n.parentSeen ? "" : "unread"}">
      <strong>${n.title}</strong> ${n.parentSeen ? "" : "<span class=\"badge new\">NEW</span>"}<br>
      ${n.message}<br>
      <small>${fmtDate(n.createdAt)}</small>
    </div>`).join("") || `<p>No notifications yet.</p>`;

  notifications.filter(n => !n.parentSeen).forEach(n =>
    api(`/notifications/${n.id}/seen`, { method: "POST" }).catch(() => {})
  );
}
