let currentUser = null;
let currentResults = [];

(async function init() {
  currentUser = await requireRole("student");
  if (!currentUser) return;
  renderTopbar("topbar", "Student");
  renderFooter("footer");
  setupTabs();
  await loadResults();
  await loadAttendance();
  await loadNotices();
  document.getElementById("downloadBtn").addEventListener("click", downloadResultPdf);
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
  const { results } = await api("/results/mine");
  currentResults = results;
  const tbody = document.querySelector("#resultsTable tbody");
  tbody.innerHTML = results.map(r => `
    <tr><td>${r.term}</td><td>${r.examName}</td><td>${r.subject}</td><td>${r.obtained}/${r.maxMarks}</td>
    <td>${((r.obtained / r.maxMarks) * 100).toFixed(1)}%</td></tr>`).join("") || `<tr><td colspan="5">No results posted yet.</td></tr>`;
}

async function loadAttendance() {
  const { records } = await api("/attendance/mine");
  const tbody = document.querySelector("#attendanceTable tbody");
  tbody.innerHTML = records.slice().sort((a, b) => b.date.localeCompare(a.date)).map(r => `
    <tr><td>${r.date}</td><td><span class="badge ${r.status.toLowerCase()}">${r.status}</span></td></tr>`).join("") || `<tr><td colspan="2">No records yet.</td></tr>`;
}

async function loadNotices() {
  const { notifications } = await api("/notifications/mine");
  const list = document.getElementById("noticesList");
  list.innerHTML = notifications.map(n => `
    <div class="notif-card ${n.studentSeen ? "" : "unread"}">
      <strong>${n.title}</strong> ${n.studentSeen ? "" : '<span class="badge new">NEW</span>'}<br>
      ${n.message}<br>
      <small>${fmtDate(n.createdAt)}</small>
    </div>`).join("") || `<p>No notices yet.</p>`;

  notifications.filter(n => !n.studentSeen).forEach(n => api(`/notifications/${n.id}/seen`, { method: "POST" }).catch(() => {}));
}

function downloadResultPdf() {
  if (!currentResults.length) { alert("No results to download yet."); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(110, 20, 35);
  doc.text("Golden Star International School", 105, 18, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('"Knowledge is power"', 105, 25, { align: "center" });
  doc.setTextColor(0);
  doc.setFontSize(13);
  doc.text("Student Result Sheet", 105, 36, { align: "center" });

  doc.setFontSize(11);
  doc.text(`Name: ${currentUser.name}`, 14, 50);

  let y = 65;
  doc.setFontSize(10);
  doc.text("Term", 14, y);
  doc.text("Exam", 50, y);
  doc.text("Subject", 90, y);
  doc.text("Marks", 130, y);
  doc.text("%", 160, y);
  y += 4;
  doc.line(14, y, 196, y);
  y += 6;

  let totalObtained = 0, totalMax = 0;
  currentResults.forEach(r => {
    doc.text(String(r.term || "-"), 14, y);
    doc.text(String(r.examName), 50, y);
    doc.text(String(r.subject), 90, y);
    doc.text(`${r.obtained}/${r.maxMarks}`, 130, y);
    doc.text(`${((r.obtained / r.maxMarks) * 100).toFixed(1)}%`, 160, y);
    totalObtained += r.obtained;
    totalMax += r.maxMarks;
    y += 8;
  });

  y += 4;
  doc.line(14, y, 196, y);
  y += 8;
  doc.setFontSize(11);
  doc.text(`Total: ${totalObtained}/${totalMax}  (${((totalObtained / totalMax) * 100).toFixed(1)}%)`, 14, y);

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("Golden Star International School - 530100 - +254 798 176 687 - goldenstarinternationalschool4@gmail.com", 105, 285, { align: "center" });

  doc.save(`${currentUser.name.replace(/\s+/g, "_")}_result.pdf`);
}
