let students = [];

(async function init() {
  const user = await requireRole("teacher");
  if (!user) return;
  renderTopbar("topbar", "Teacher");
  renderFooter("footer");
  setupTabs();
  await loadStudents();
  bindForms();
  document.getElementById("a_date").value = new Date().toISOString().slice(0, 10);
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

async function loadStudents() {
  const data = await api("/students");
  students = data.students;
  const tbody = document.querySelector("#studentsTable tbody");
  tbody.innerHTML = students.map(s => `
    <tr><td>${s.admissionNo}</td><td>${s.name}</td><td>${s.className}</td><td>${s.section || ""}</td></tr>
  `).join("") || `<tr><td colspan="4">No students yet.</td></tr>`;

  const optHtml = students.map(s => `<option value="${s.id}">${s.name} (${s.admissionNo}) - Class ${s.className}${s.section || ""}</option>`).join("");
  document.getElementById("a_student").innerHTML = optHtml;
  document.getElementById("r_student").innerHTML = optHtml;
}

function bindForms() {
  document.getElementById("a_submit").addEventListener("click", async () => {
    const msg = document.getElementById("attendanceMsg");
    msg.innerHTML = "";
    try {
      const body = {
        studentId: document.getElementById("a_student").value,
        date: document.getElementById("a_date").value,
        status: document.getElementById("a_status").value
      };
      await api("/attendance", { method: "POST", body });
      msg.innerHTML = `<div class="msg success">Attendance marked.</div>`;
    } catch (err) {
      msg.innerHTML = `<div class="msg error">${err.message}</div>`;
    }
  });

  document.getElementById("resultForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("resultMsg");
    msg.innerHTML = "";
    try {
      const body = {
        studentId: document.getElementById("r_student").value,
        term: document.getElementById("r_term").value.trim(),
        examName: document.getElementById("r_exam").value.trim(),
        subject: document.getElementById("r_subject").value.trim(),
        maxMarks: document.getElementById("r_max").value,
        obtained: document.getElementById("r_obtained").value
      };
      await api("/results", { method: "POST", body });
      msg.innerHTML = `<div class="msg success">Result posted. Student & parent notified.</div>`;
      e.target.reset();
    } catch (err) {
      msg.innerHTML = `<div class="msg error">${err.message}</div>`;
    }
  });
}
