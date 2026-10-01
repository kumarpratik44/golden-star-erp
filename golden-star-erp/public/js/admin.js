let students = [];
let teachers = [];

(async function init() {
  const user = await requireRole("admin");
  if (!user) return;
  renderTopbar("topbar", "Admin");
  renderFooter("footer");
  setupTabs();
  await loadStudents();
  await loadTeachers();
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

function studentOptionsHtml() {
  return students.map(s => `<option value="${s.id}">${s.name} (${s.admissionNo}) - Class ${s.className}${s.section || ""}</option>`).join("");
}

function fillStudentSelects() {
  const html = studentOptionsHtml();
  ["r_student", "r_viewStudent", "a_student", "a_viewStudent", "n_student"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  });
}

async function loadStudents() {
  const data = await api("/students");
  students = data.students;
  const tbody = document.querySelector("#studentsTable tbody");
  tbody.innerHTML = students.map(s => `
    <tr>
      <td>${s.admissionNo}</td>
      <td>${s.name}</td>
      <td>${s.className}</td>
      <td>${s.section || ""}</td>
      <td>${s.parentName || ""}${s.parentPhone ? " (" + s.parentPhone + ")" : ""}</td>
      <td>
        <button class="btn sm ghost" onclick="resetPassword('${s.id}','student')">Reset Student Pwd</button>
        <button class="btn sm ghost" onclick="resetPassword('${s.id}','parent')">Reset Parent Pwd</button>
        <button class="btn sm danger" onclick="deleteStudent('${s.id}')">Delete</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="6">No students yet.</td></tr>`;
  fillStudentSelects();
}

async function loadTeachers() {
  const data = await api("/teachers");
  teachers = data.teachers;
  const tbody = document.querySelector("#teachersTable tbody");
  tbody.innerHTML = teachers.map(t => `
    <tr>
      <td>${t.name}</td>
      <td>${t.phone}</td>
      <td>${t.subject || ""}</td>
      <td>${t.className || ""}</td>
      <td>
        <button class="btn sm ghost" onclick="resetTeacherPassword('${t.id}')">Reset Password</button>
        <button class="btn sm danger" onclick="deleteTeacher('${t.id}')">Delete</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="5">No teachers yet.</td></tr>`;
}

function bindForms() {
  document.getElementById("studentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("studentMsg");
    msg.innerHTML = "";
    try {
      const body = {
        name: document.getElementById("s_name").value.trim(),
        className: document.getElementById("s_class").value.trim(),
        section: document.getElementById("s_section").value.trim(),
        dob: document.getElementById("s_dob").value,
        admissionYear: document.getElementById("s_year").value,
        gender: document.getElementById("s_gender").value,
        address: document.getElementById("s_address").value.trim(),
        parentName: document.getElementById("s_parentName").value.trim(),
        parentPhone: document.getElementById("s_parentPhone").value.trim(),
        parentEmail: document.getElementById("s_parentEmail").value.trim()
      };
      const { credentials } = await api("/students", { method: "POST", body });
      msg.innerHTML = `<div class="msg success">Student added.</div>`;
      showCredentials(credentials);
      e.target.reset();
      await loadStudents();
    } catch (err) {
      msg.innerHTML = `<div class="msg error">${err.message}</div>`;
    }
  });

  document.getElementById("teacherForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("teacherMsg");
    msg.innerHTML = "";
    try {
      const body = {
        name: document.getElementById("t_name").value.trim(),
        phone: document.getElementById("t_phone").value.trim(),
        subject: document.getElementById("t_subject").value.trim(),
        className: document.getElementById("t_class").value.trim()
      };
      const { credentials } = await api("/teachers", { method: "POST", body });
      msg.innerHTML = `<div class="msg success">Teacher added.</div>`;
      document.getElementById("teacherCredCard").style.display = "block";
      document.getElementById("teacherCredBox").innerHTML = `
        <p><strong>Login phone:</strong> ${credentials.phone}<br>
        <strong>Password:</strong> ${credentials.password}</p>`;
      e.target.reset();
      await loadTeachers();
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
      if (document.getElementById("r_viewStudent").value === body.studentId) loadResultsFor(body.studentId);
    } catch (err) {
      msg.innerHTML = `<div class="msg error">${err.message}</div>`;
    }
  });

  document.getElementById("r_viewStudent").addEventListener("change", (e) => loadResultsFor(e.target.value));
  document.getElementById("a_viewStudent").addEventListener("change", (e) => loadAttendanceFor(e.target.value));

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
      if (document.getElementById("a_viewStudent").value === body.studentId) loadAttendanceFor(body.studentId);
    } catch (err) {
      msg.innerHTML = `<div class="msg error">${err.message}</div>`;
    }
  });

  document.getElementById("noticeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("noticeMsg");
    msg.innerHTML = "";
    try {
      const body = {
        studentId: document.getElementById("n_student").value,
        title: document.getElementById("n_title").value.trim(),
        message: document.getElementById("n_message").value.trim()
      };
      await api("/notifications", { method: "POST", body });
      msg.innerHTML = `<div class="msg success">Notice sent. Student & parent notified.</div>`;
      e.target.reset();
    } catch (err) {
      msg.innerHTML = `<div class="msg error">${err.message}</div>`;
    }
  });
}

function showCredentials(credentials) {
  const card = document.getElementById("credentialsCard");
  card.style.display = "block";
  document.getElementById("credentialsBox").innerHTML = `
    <p><strong>Student login</strong><br>
    Admission No: ${credentials.studentLogin.admissionNo}<br>
    Password: ${credentials.studentLogin.password}</p>
    <p><strong>Parent login</strong><br>
    Admission No: ${credentials.parentLogin.admissionNo}<br>
    Password: ${credentials.parentLogin.password}</p>`;
}

async function loadResultsFor(studentId) {
  if (!studentId) return;
  const { results } = await api(`/results/student/${studentId}`);
  const tbody = document.querySelector("#resultsTable tbody");
  tbody.innerHTML = results.map(r => `
    <tr><td>${r.term}</td><td>${r.examName}</td><td>${r.subject}</td><td>${r.obtained}/${r.maxMarks}</td>
    <td>${((r.obtained / r.maxMarks) * 100).toFixed(1)}%</td></tr>`).join("") || `<tr><td colspan="5">No results yet.</td></tr>`;
}

async function loadAttendanceFor(studentId) {
  if (!studentId) return;
  const { records } = await api(`/attendance/student/${studentId}`);
  const tbody = document.querySelector("#attendanceTable tbody");
  tbody.innerHTML = records.slice().sort((a, b) => b.date.localeCompare(a.date)).map(r => `
    <tr><td>${r.date}</td><td><span class="badge ${r.status.toLowerCase()}">${r.status}</span></td></tr>`).join("") || `<tr><td colspan="2">No records yet.</td></tr>`;
}

async function resetPassword(studentId, target) {
  if (!confirm(`Reset ${target} password for this student?`)) return;
  const data = await api(`/students/${studentId}/reset-password`, { method: "POST", body: { target } });
  alert(`New ${target} password for ${data.admissionNo}: ${data.newPassword}`);
}

async function resetTeacherPassword(teacherId) {
  if (!confirm("Reset this teacher's password?")) return;
  const data = await api(`/teachers/${teacherId}/reset-password`, { method: "POST" });
  alert(`New password for ${data.phone}: ${data.newPassword}`);
}

async function deleteStudent(id) {
  if (!confirm("Delete this student permanently?")) return;
  await api(`/students/${id}`, { method: "DELETE" });
  await loadStudents();
}

async function deleteTeacher(id) {
  if (!confirm("Delete this teacher permanently?")) return;
  await api(`/teachers/${id}`, { method: "DELETE" });
  await loadTeachers();
}
