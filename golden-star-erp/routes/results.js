const express = require("express");
const db = require("../lib/db");
const { requireRole } = require("../lib/auth");
const { sendParentAlert } = require("../lib/notifier");

const router = express.Router();

function addNotification(data, studentId, title, message, type) {
  data.notifications.push({
    id: db.nextId(data),
    studentId,
    title,
    message,
    type, // "result" | "attendance" | "general"
    createdAt: new Date().toISOString(),
    studentSeen: false,
    parentSeen: false
  });
}

// Admin/teacher: post a result for a student (also creates a notification)
router.post("/", requireRole("admin", "teacher"), (req, res) => {
  const { studentId, term, examName, subject, maxMarks, obtained } = req.body;
  if (!studentId || !examName || !subject || maxMarks === undefined || obtained === undefined) {
    return res.status(400).json({ error: "studentId, examName, subject, maxMarks, obtained are required" });
  }
  const data = db.load();
  const student = data.students.find(s => s.id === studentId);
  if (!student) return res.status(404).json({ error: "Student not found" });

  const result = {
    id: db.nextId(data),
    studentId,
    term: term || "",
    examName,
    subject,
    maxMarks: Number(maxMarks),
    obtained: Number(obtained),
    postedAt: new Date().toISOString()
  };
  data.results.push(result);

  addNotification(
    data,
    studentId,
    "New result posted",
    `${examName} - ${subject}: ${obtained}/${maxMarks} has been posted. Please check the portal.`,
    "result"
  );

  db.save(data);
  sendParentAlert(student, `New result posted for ${student.name}: ${examName} - ${subject} (${obtained}/${maxMarks}). Please check the portal.`);
  res.json({ result });
});

// Admin/teacher: view a specific student's results
router.get("/student/:studentId", requireRole("admin", "teacher"), (req, res) => {
  const data = db.load();
  const results = data.results.filter(r => r.studentId === req.params.studentId);
  res.json({ results });
});

// Student: view own results
router.get("/mine", requireRole("student"), (req, res) => {
  const data = db.load();
  const results = data.results.filter(r => r.studentId === req.session.user.id);
  res.json({ results });
});

// Parent: view child's results
router.get("/parent", requireRole("parent"), (req, res) => {
  const data = db.load();
  const results = data.results.filter(r => r.studentId === req.session.user.studentId);
  res.json({ results });
});

// Admin: delete a result
router.delete("/:id", requireRole("admin"), (req, res) => {
  const data = db.load();
  const before = data.results.length;
  data.results = data.results.filter(r => r.id !== req.params.id);
  if (data.results.length === before) return res.status(404).json({ error: "Result not found" });
  db.save(data);
  res.json({ ok: true });
});

module.exports = router;
