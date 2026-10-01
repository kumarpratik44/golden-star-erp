let students = [];

(async function init() {
  const user = await requireRole("teacher");
  if (!user) return;
  renderTopbar("topbar", "Teacher");
  renderFooter("footer");
  setupTabs();
  a_date.value = new Date().toISOString().slice(0, 10);
  await loadStudents();
  await loadContent();
  bindForms();
})();

async function loadStudents() {
  const { students: list } = await api("/students");
  students = list;
  studentsTable.querySelector("tbody").innerHTML = students.map(s => `
    <tr><td>${s.admissionNo}</td><td>${s.name}</td><td>${s.className}</td><td>${s.section || ""}</td></tr>`
  ).join("") || `<tr><td colspan="4">No students found.</td></tr>`;

  const html = students.map(s => `<option value="${s.id}">${s.name} (${s.admissionNo}) — ${s.className}${s.section || ""}</option>`).join("");
  a_student.innerHTML = html;
  r_student.innerHTML = html;
}

async function loadContent() {
  const [subjectsData, contentData] = await Promise.all([api("/school/subjects"), api("/school/content")]);

  const usableSubjects = subjectsData.subjects;
  c_subject.innerHTML = usableSubjects.map(s => `<option value="${s.id}">${s.name} — Class ${s.className}</option>`).join("");
  r_subject.innerHTML = usableSubjects.map(s => `<option value="${s.id}">${s.name} — Class ${s.className}</option>`).join("");

  contentList.innerHTML = contentData.content.map(c => `
    <div class="notif-card">
      <strong>${c.subjectName}: ${c.title}</strong><br>${c.body}<br>
      <small>${fmtDate(c.createdAt)} · ${c.postedBy}</small><br>
      <button class="btn sm danger" onclick="deleteContent('${c.id}')">Remove</button>
    </div>`).join("") || `<p>No updates published yet.</p>`;
}

function bindForms() {
  a_submit.addEventListener("click", async () => {
    try {
      await api("/attendance", {
        method: "POST",
        body: { studentId: a_student.value, date: a_date.value, status: a_status.value }
      });
      attendanceMsg.innerHTML = `<div class="msg success">Attendance marked.</div>`;
    } catch (e) {
      attendanceMsg.innerHTML = `<div class="msg error">${e.message}</div>`;
    }
  });

  resultForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/results", {
        method: "POST",
        body: {
          studentId: r_student.value,
          term: r_term.value.trim(),
          examName: r_exam.value.trim(),
          subjectId: r_subject.value,
          maxMarks: r_max.value,
          obtained: r_obtained.value
        }
      });
      resultMsg.innerHTML = `<div class="msg success">Result posted. Student and parent notified.</div>`;
      e.target.reset();
    } catch (err) {
      resultMsg.innerHTML = `<div class="msg error">${err.message}</div>`;
    }
  });

  contentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/school/content", {
        method: "POST",
        body: { subjectId: c_subject.value, title: c_title.value.trim(), body: c_body.value.trim() }
      });
      contentMsg.innerHTML = `<div class="msg success">Subject update published.</div>`;
      e.target.reset();
      await loadContent();
    } catch (err) {
      contentMsg.innerHTML = `<div class="msg error">${err.message}</div>`;
    }
  });
}

async function deleteContent(id) {
  if (!confirm("Remove this update?")) return;
  await api(`/school/content/${id}`, { method: "DELETE" });
  await loadContent();
}
