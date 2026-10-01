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
  resultsTable.querySelector("tbody").innerHTML = results.map(r => `
    <tr><td>${r.term}</td><td>${r.examName}</td><td>${r.subject}</td><td>${r.obtained}/${r.maxMarks}</td>
    <td>${((r.obtained / r.maxMarks) * 100).toFixed(1)}%</td></tr>`).join("") || `<tr><td colspan="5">No results yet.</td></tr>`;
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
