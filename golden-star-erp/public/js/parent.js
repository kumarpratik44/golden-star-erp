(async function init() {
  const user = await requireRole("parent");
  if (!user) return;
  renderTopbar("topbar", "Parent");
  renderFooter("footer");
  setupTabs();
  await loadResults();
  await loadAttendance();
  await loadNotices();
})();

function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    });
  });
}

async function loadResults() {
  const { results } = await api("/results/parent");
  const tbody = document.querySelector("#resultsTable tbody");
  tbody.innerHTML = results.map(r => `
    <tr><td>${r.term}</td><td>${r.examName}</td><td>${r.subject}</td><td>${r.obtained}/${r.maxMarks}</td>
    <td>${((r.obtained / r.maxMarks) * 100).toFixed(1)}%</td></tr>`).join("") || `<tr><td colspan="5">No results posted yet.</td></tr>`;
}

async function loadAttendance() {
  const { records } = await api("/attendance/parent");
  const tbody = document.querySelector("#attendanceTable tbody");
  tbody.innerHTML = records.slice().sort((a, b) => b.date.localeCompare(a.date)).map(r => `
    <tr><td>${r.date}</td><td><span class="badge ${r.status.toLowerCase()}">${r.status}</span></td></tr>`).join("") || `<tr><td colspan="2">No records yet.</td></tr>`;
}

async function loadNotices() {
  const { notifications } = await api("/notifications/parent");
  const list = document.getElementById("noticesList");
  list.innerHTML = notifications.map(n => `
    <div class="notif-card ${n.parentSeen ? "" : "unread"}">
      <strong>${n.title}</strong> ${n.parentSeen ? "" : '<span class="badge new">NEW</span>'}<br>
      ${n.message}<br>
      <small>${fmtDate(n.createdAt)}</small>
    </div>`).join("") || `<p>No notices yet.</p>`;

  notifications.filter(n => !n.parentSeen).forEach(n => api(`/notifications/${n.id}/seen`, { method: "POST" }).catch(() => {}));
}
