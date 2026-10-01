let students = [];
let teachers = [];
let subjects = [];

(async function init() {
  const user = await requireRole("admin");
  if (!user) return;
  renderTopbar("topbar", "Admin");
  renderFooter("footer");
  setupTabs();
  document.getElementById("a_date").value = new Date().toISOString().slice(0, 10);
  await loadStudents();
  await loadTeachers();
  await loadAcademic();
  bindForms();
})();

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
  const { students: list } = await api("/students");
  students = list;
  document.querySelector("#studentsTable tbody").innerHTML = students.map(s => `
    <tr>
      <td>${s.photo ? `<img src="${s.photo}" class="avatar-sm" alt="">` : "—"}</td>
      <td>${s.admissionNo}</td>
      <td>${s.name}</td>
      <td>${s.className}</td>
      <td>${s.section || ""}</td>
      <td>${s.parentName || ""}${s.parentPhone ? " (" + s.parentPhone + ")" : ""}</td>
      <td>
        <button class="btn sm ghost" onclick="resetPassword('${s.id}','student')">Student Pwd</button>
        <button class="btn sm ghost" onclick="resetPassword('${s.id}','parent')">Parent Pwd</button>
        <button class="btn sm danger" onclick="deleteStudent('${s.id}')">Delete</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="6">No students yet.</td></tr>`;
  fillStudentSelects();
}

async function loadTeachers() {
  const { teachers: list } = await api("/teachers");
  teachers = list;
  document.querySelector("#teachersTable tbody").innerHTML = teachers.map(t => `
    <tr>
      <td>${t.photo ? `<img src="${t.photo}" class="avatar-sm" alt="">` : "—"}</td>
      <td>${t.name}</td>
      <td>${t.phone}</td>
      <td>${t.subject || ""}</td>
      <td>${t.className || ""}</td>
      <td>
        <button class="btn sm ghost" onclick="resetTeacherPassword('${t.id}')">Reset Password</button>
        <button class="btn sm danger" onclick="deleteTeacher('${t.id}')">Delete</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="6">No teachers yet.</td></tr>`;

  const sel = document.getElementById("sub_teacher");
  if (sel) {
    sel.innerHTML = `<option value="">Not assigned</option>` +
      teachers.map(t => `<option value="${t.id}">${t.name} — ${t.subject || "Teacher"}</option>`).join("");
  }
}

async function loadAcademic() {
  const [sub, hol, tt] = await Promise.all([
    api("/school/subjects"),
    api("/school/holidays"),
    api("/school/timetable")
  ]);
  subjects = sub.subjects;

  document.querySelector("#subjectsTable tbody").innerHTML = subjects.map(s => {
    const t = teachers.find(x => x.id === s.teacherId);
    return `
      <tr>
        <td>${s.name}</td>
        <td>${s.className}</td>
        <td>${t ? t.name : "Not assigned"}</td>
        <td><button class="btn sm danger" onclick="deleteSubject('${s.id}')">Delete</button></td>
      </tr>`;
  }).join("") || `<tr><td colspan="4">No subjects yet.</td></tr>`;

  document.getElementById("tt_subject").innerHTML =
    subjects.map(s => `<option value="${s.id}">${s.name} — Class ${s.className}</option>`).join("");

  document.querySelector("#holidaysTable tbody").innerHTML = hol.holidays.map(h => `
    <tr>
      <td>${h.date}</td>
      <td>${h.title}</td>
      <td><button class="btn sm danger" onclick="deleteHoliday('${h.id}')">Delete</button></td>
    </tr>`).join("") || `<tr><td colspan="3">No holidays added.</td></tr>`;

  document.querySelector("#ttTable tbody").innerHTML = tt.timetable.map(x => `
    <tr>
      <td>${x.className}${x.section ? "-" + x.section : ""}</td>
      <td>${x.day}</td>
      <td>${x.startTime}–${x.endTime}</td>
      <td>${x.subjectName}</td>
      <td>${x.room || ""}</td>
      <td><button class="btn sm danger" onclick="deleteTimetable('${x.id}')">Delete</button></td>
    </tr>`).join("") || `<tr><td colspan="6">No timetable entries yet.</td></tr>`;

  refreshResultSubjects();
}

function refreshResultSubjects(){
  const student=students.find(s=>s.id===r_student.value);
  const list=student?subjects.filter(s=>String(s.className).trim().toLowerCase()===String(student.className).trim().toLowerCase()):[];
  r_subjectSelect.innerHTML='<option value="">Select a subject</option>'+list.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
}

function bindForms() {
  document.getElementById("studentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const photo = await imageFileToDataUrl(s_photo.files[0]);
      const { credentials } = await api("/students", {
        method: "POST",
        body: {
          name: s_name.value.trim(), className: s_class.value.trim(), section: s_section.value.trim(), dob: s_dob.value,
          admissionYear: s_year.value, gender: s_gender.value, address: s_address.value.trim(), parentName: s_parentName.value.trim(),
          parentPhone: s_parentPhone.value.trim(), parentEmail: s_parentEmail.value.trim(), photo
        }
      });
      studentMsg.innerHTML = `<div class="msg success">Student added.</div>`;
      showCredentials(credentials);
      e.target.reset();
      s_year.value = new Date().getFullYear();
      await loadStudents();
    } catch (err) {
      studentMsg.innerHTML = `<div class="msg error">${err.message}</div>`;
    }
  });

  document.getElementById("teacherForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const { credentials } = await api("/teachers", {
        method: "POST",
        body: {
          name: t_name.value.trim(),
          phone: t_phone.value.trim(),
          subject: t_subject.value.trim(),
          className: t_class.value.trim(),
          photo: await imageFileToDataUrl(t_photo.files[0])
        }
      });
      teacherMsg.innerHTML = `<div class="msg success">Teacher added.</div>`;
      teacherCredCard.style.display = "block";
      teacherCredBox.innerHTML = `<p><strong>Login:</strong> ${credentials.phone}<br><strong>Password:</strong> ${credentials.password}</p>`;
      e.target.reset();
      await loadTeachers();
    } catch (err) {
      teacherMsg.innerHTML = `<div class="msg error">${err.message}</div>`;
    }
  });

  document.getElementById("subjectForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/school/subjects", {
        method: "POST",
        body: { name: sub_name.value.trim(), className: sub_class.value.trim(), teacherId: sub_teacher.value }
      });
      subjectMsg.innerHTML = `<div class="msg success">Subject added.</div>`;
      e.target.reset();
      await loadAcademic();
    } catch (err) {
      subjectMsg.innerHTML = `<div class="msg error">${err.message}</div>`;
    }
  });

  document.getElementById("holidayForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/school/holidays", {
        method: "POST",
        body: { date: h_date.value, title: h_title.value.trim(), description: h_desc.value.trim() }
      });
      holidayMsg.innerHTML = `<div class="msg success">Holiday added.</div>`;
      e.target.reset();
      await loadAcademic();
    } catch (err) {
      holidayMsg.innerHTML = `<div class="msg error">${err.message}</div>`;
    }
  });

  document.getElementById("timetableForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/school/timetable", {
        method: "POST",
        body: {
          className: tt_class.value.trim(),
          section: tt_section.value.trim(),
          day: tt_day.value,
          startTime: tt_start.value,
          endTime: tt_end.value,
          subjectId: tt_subject.value,
          room: tt_room.value.trim()
        }
      });
      ttMsg.innerHTML = `<div class="msg success">Timetable entry added.</div>`;
      e.target.reset();
      await loadAcademic();
    } catch (err) {
      ttMsg.innerHTML = `<div class="msg error">${err.message}</div>`;
    }
  });

  document.getElementById("resultForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/results", {
        method: "POST",
        body: { studentId:r_student.value, term:r_term.value.trim(), examName:r_exam.value.trim(), subjectId:r_subjectSelect.value, maxMarks:r_max.value, obtained:r_obtained.value }
      });
      resultMsg.innerHTML = `<div class="msg success">Result posted. Student and parent notified.</div>`;
      e.target.reset();
      if (r_viewStudent.value) loadResultsFor(r_viewStudent.value);
    } catch (err) {
      resultMsg.innerHTML = `<div class="msg error">${err.message}</div>`;
    }
  });

  r_student.addEventListener("change", refreshResultSubjects);
  r_viewStudent.addEventListener("change", (e) => loadResultsFor(e.target.value));
  a_viewStudent.addEventListener("change", (e) => loadAttendanceFor(e.target.value));

  a_submit.addEventListener("click", async () => {
    try {
      await api("/attendance", {
        method: "POST",
        body: { studentId: a_student.value, date: a_date.value, status: a_status.value }
      });
      attendanceMsg.innerHTML = `<div class="msg success">Attendance marked.</div>`;
      if (a_viewStudent.value === a_student.value) loadAttendanceFor(a_student.value);
    } catch (err) {
      attendanceMsg.innerHTML = `<div class="msg error">${err.message}</div>`;
    }
  });

  document.getElementById("noticeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/notifications", {
        method: "POST",
        body: { studentId: n_student.value, title: n_title.value.trim(), message: n_message.value.trim() }
      });
      noticeMsg.innerHTML = `<div class="msg success">Notice sent. Student and parent notified.</div>`;
      e.target.reset();
    } catch (err) {
      noticeMsg.innerHTML = `<div class="msg error">${err.message}</div>`;
    }
  });

  document.getElementById("passwordForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/school/password", {
        method: "POST",
        body: { currentPassword: p_current.value, newPassword: p_new.value }
      });
      passwordMsg.innerHTML = `<div class="msg success">Admin password changed.</div>`;
      e.target.reset();
    } catch (err) {
      passwordMsg.innerHTML = `<div class="msg error">${err.message}</div>`;
    }
  });
}

function showCredentials(c) {
  credentialsCard.style.display = "block";
  credentialsBox.innerHTML = `
    <p><strong>Student</strong><br>Admission: ${c.studentLogin.admissionNo}<br>Password: ${c.studentLogin.password}</p>
    <p><strong>Parent</strong><br>Admission: ${c.parentLogin.admissionNo}<br>Password: ${c.parentLogin.password}</p>`;
}

async function loadResultsFor(id) {
  if (!id) return;
  const { results } = await api(`/results/student/${id}`);
  const groups = {};
  results.forEach(r => { const key = `${r.term || ""}|||${r.examName}`; (groups[key] ||= {term:r.term||"",exam:r.examName,rows:[]}).rows.push(r); });
  const rows = Object.values(groups).sort((a,b)=>(a.term+a.exam).localeCompare(b.term+b.exam)).map(g => {
    const total=g.rows.reduce((a,r)=>a+Number(r.obtained),0), max=g.rows.reduce((a,r)=>a+Number(r.maxMarks),0), pct=max?total/max*100:0;
    const grade=pct>=90?'A+':pct>=80?'A':pct>=70?'B':pct>=60?'C':pct>=50?'D':'E';
    return `<tr><td>${g.term||"-"}</td><td>${g.exam}</td><td>${g.rows.map(r=>`${r.subject}: ${r.obtained}/${r.maxMarks}`).join('<br>')}</td><td>${total}/${max}</td><td>${pct.toFixed(1)}%</td><td>${grade}</td></tr>`;
  }).join('');
  resultsTable.querySelector('tbody').innerHTML=rows||`<tr><td colspan="6">No results yet.</td></tr>`;
}

async function loadAttendanceFor(id) {
  if (!id) return;
  const { records } = await api(`/attendance/student/${id}`);
  attendanceTable.querySelector("tbody").innerHTML = records.slice().sort((a, b) => b.date.localeCompare(a.date)).map(r => `
    <tr><td>${r.date}</td><td><span class="badge ${r.status.toLowerCase()}">${r.status}</span></td></tr>`).join("") || `<tr><td colspan="2">No records yet.</td></tr>`;
}

async function resetPassword(id, target) {
  if (!confirm(`Reset ${target} password?`)) return;
  const d = await api(`/students/${id}/reset-password`, { method: "POST", body: { target } });
  alert(`New ${target} password for ${d.admissionNo}: ${d.newPassword}`);
}

async function resetTeacherPassword(id) {
  if (!confirm("Reset teacher password?")) return;
  const d = await api(`/teachers/${id}/reset-password`, { method: "POST" });
  alert(`New password for ${d.phone}: ${d.newPassword}`);
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
  await loadAcademic();
}

async function deleteSubject(id) {
  if (!confirm("Delete this subject and related timetable/content?")) return;
  await api(`/school/subjects/${id}`, { method: "DELETE" });
  await loadAcademic();
}

async function deleteHoliday(id) {
  await api(`/school/holidays/${id}`, { method: "DELETE" });
  await loadAcademic();
}

async function deleteTimetable(id) {
  await api(`/school/timetable/${id}`, { method: "DELETE" });
  await loadAcademic();
}
