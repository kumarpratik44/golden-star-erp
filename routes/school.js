const express = require("express");
const db = require("../lib/db");
const { requireRole } = require("../lib/auth");

const router = express.Router();

router.get("/public", (req, res) => {
  const data = db.load();
  res.json({ school: data.school });
});

router.get("/subjects", requireRole("admin", "teacher", "student", "parent"), (req, res) => {
  const data = db.load();
  let list = data.subjects;
  if (req.session.user.role === "teacher") {
    const teacher = data.teachers.find(t => t.id === req.session.user.id);
    list = teacher ? list.filter(s => s.teacherId === teacher.id || (!s.teacherId && teacher.className && String(s.className).trim() === String(teacher.className).trim())) : [];
  }
  if (req.session.user.role === "student" || req.session.user.role === "parent") {
    const studentId = req.session.user.id || req.session.user.studentId;
    const student = data.students.find(s => s.id === studentId);
    list = student ? list.filter(s => String(s.className).trim() === String(student.className).trim()) : [];
  }
  res.json({ subjects: list });
});

router.post("/subjects", requireRole("admin"), (req, res) => {
  const { name, className, teacherId } = req.body;
  if (!name || !className) return res.status(400).json({ error: "Subject name and class are required" });
  const data = db.load();
  const cleanName = name.trim();
  const cleanClass = String(className).trim();
  if (data.subjects.some(x => x.name.toLowerCase() === cleanName.toLowerCase() && String(x.className).trim().toLowerCase() === cleanClass.toLowerCase())) return res.status(400).json({ error: "This subject already exists for this class" });
  if (teacherId && !data.teachers.some(t => t.id === teacherId)) return res.status(400).json({ error: "Assigned teacher not found" });
  const subject = { id: db.nextId(data), name: cleanName, className: cleanClass, teacherId: teacherId || "", createdAt: new Date().toISOString() };
  data.subjects.push(subject);
  db.save(data);
  res.json({ subject });
});

router.delete("/subjects/:id", requireRole("admin"), (req, res) => {
  const data = db.load();
  const before = data.subjects.length;
  data.subjects = data.subjects.filter(x => x.id !== req.params.id);
  if (before === data.subjects.length) return res.status(404).json({ error: "Subject not found" });
  data.subjectContent = data.subjectContent.filter(x => x.subjectId !== req.params.id);
  data.timetable = data.timetable.filter(x => x.subjectId !== req.params.id);
  db.save(data);
  res.json({ ok: true });
});

router.get("/timetable", requireRole("admin", "teacher", "student", "parent"), (req, res) => {
  const data = db.load();
  let list = data.timetable;
  if (req.session.user.role === "student" || req.session.user.role === "parent") {
    const studentId = req.session.user.id || req.session.user.studentId;
    const student = data.students.find(s => s.id === studentId);
    list = student ? list.filter(x => x.className === student.className && (!x.section || x.section === student.section)) : [];
  }
  res.json({ timetable: list });
});

router.post("/timetable", requireRole("admin"), (req, res) => {
  const { className, section, day, startTime, endTime, subjectId, room } = req.body;
  if (!className || !day || !startTime || !endTime || !subjectId) return res.status(400).json({ error: "Class, day, times and subject are required" });
  const data = db.load();
  const subject = data.subjects.find(x => x.id === subjectId);
  if (!subject) return res.status(404).json({ error: "Subject not found" });
  const item = { id: db.nextId(data), className, section: section || "", day, startTime, endTime, subjectId, subjectName: subject.name, room: room || "" };
  data.timetable.push(item);
  db.save(data);
  res.json({ timetable: item });
});

router.delete("/timetable/:id", requireRole("admin"), (req, res) => {
  const data = db.load();
  const before = data.timetable.length;
  data.timetable = data.timetable.filter(x => x.id !== req.params.id);
  if (before === data.timetable.length) return res.status(404).json({ error: "Timetable entry not found" });
  db.save(data);
  res.json({ ok: true });
});

router.get("/holidays", requireRole("admin", "teacher", "student", "parent"), (req, res) => {
  const data = db.load();
  res.json({ holidays: data.holidays.slice().sort((a, b) => a.date.localeCompare(b.date)) });
});

router.post("/holidays", requireRole("admin"), (req, res) => {
  const { date, title, description } = req.body;
  if (!date || !title) return res.status(400).json({ error: "Date and title are required" });
  const data = db.load();
  const holiday = { id: db.nextId(data), date, title: title.trim(), description: description || "" };
  data.holidays.push(holiday);
  db.save(data);
  res.json({ holiday });
});

router.delete("/holidays/:id", requireRole("admin"), (req, res) => {
  const data = db.load();
  const before = data.holidays.length;
  data.holidays = data.holidays.filter(x => x.id !== req.params.id);
  if (before === data.holidays.length) return res.status(404).json({ error: "Holiday not found" });
  db.save(data);
  res.json({ ok: true });
});

router.get("/content", requireRole("admin", "teacher", "student", "parent"), (req, res) => {
  const data = db.load();
  let list = data.subjectContent;
  if (req.session.user.role === "student" || req.session.user.role === "parent") {
    const studentId = req.session.user.id || req.session.user.studentId;
    const student = data.students.find(s => s.id === studentId);
    const subjectIds = data.subjects.filter(s => student && s.className === student.className).map(s => s.id);
    list = list.filter(x => subjectIds.includes(x.subjectId));
  }
  res.json({ content: list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
});

router.post("/content", requireRole("admin", "teacher"), (req, res) => {
  const { subjectId, title, body } = req.body;
  if (!subjectId || !title || !body) return res.status(400).json({ error: "Subject, title and content are required" });
  const data = db.load();
  const subject = data.subjects.find(x => x.id === subjectId);
  if (!subject) return res.status(404).json({ error: "Subject not found" });
  if (req.session.user.role === "teacher" && subject.teacherId && subject.teacherId !== req.session.user.id) return res.status(403).json({ error: "You are not assigned to this subject" });
  const item = { id: db.nextId(data), subjectId, subjectName: subject.name, title: title.trim(), body: body.trim(), postedBy: req.session.user.name, createdAt: new Date().toISOString() };
  data.subjectContent.push(item);
  db.save(data);
  res.json({ content: item });
});

router.delete("/content/:id", requireRole("admin", "teacher"), (req, res) => {
  const data = db.load();
  const item = data.subjectContent.find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Content not found" });
  if (req.session.user.role === "teacher" && item.postedBy !== req.session.user.name) return res.status(403).json({ error: "You can only remove your own content" });
  data.subjectContent = data.subjectContent.filter(x => x.id !== req.params.id);
  db.save(data);
  res.json({ ok: true });
});

router.post("/password", requireRole("admin"), (req, res) => {
  const bcrypt = require("bcryptjs");
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) return res.status(400).json({ error: "Current password and a new password of at least 8 characters are required" });
  const data = db.load();
  if (!bcrypt.compareSync(currentPassword, data.admin.passwordHash)) return res.status(401).json({ error: "Current password is incorrect" });
  data.admin.passwordHash = bcrypt.hashSync(newPassword, 10);
  db.save(data);
  res.json({ ok: true });
});

module.exports = router;
