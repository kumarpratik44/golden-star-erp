const express = require("express");
const db = require("../lib/db");
const { requireRole } = require("../lib/auth");
const { sendParentAlert } = require("../lib/notifier");

const router = express.Router();

// Admin: post a general notice to one student (e.g. "fee due", "PTM on Friday")
router.post("/", requireRole("admin", "teacher"), (req, res) => {
  const { studentId, title, message } = req.body;
  if (!studentId || !title || !message) return res.status(400).json({ error: "studentId, title, message are required" });
  const data = db.load();
  const student = data.students.find(s => s.id === studentId);
  if (!student) return res.status(404).json({ error: "Student not found" });

  const notification = {
    id: db.nextId(data),
    studentId,
    title,
    message,
    type: "general",
    createdAt: new Date().toISOString(),
    studentSeen: false,
    parentSeen: false
  };
  data.notifications.push(notification);
  db.save(data);
  sendParentAlert(student, `${title}: ${message}`);
  res.json({ notification });
});

router.get("/student/:studentId", requireRole("admin", "teacher"), (req, res) => {
  const data = db.load();
  const list = data.notifications.filter(n => n.studentId === req.params.studentId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ notifications: list });
});

router.get("/mine", requireRole("student"), (req, res) => {
  const data = db.load();
  const list = data.notifications.filter(n => n.studentId === req.session.user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ notifications: list });
});

router.get("/parent", requireRole("parent"), (req, res) => {
  const data = db.load();
  const list = data.notifications.filter(n => n.studentId === req.session.user.studentId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ notifications: list });
});

router.post("/:id/seen", requireRole("student", "parent"), (req, res) => {
  const data = db.load();
  const n = data.notifications.find(x => x.id === req.params.id);
  if (!n) return res.status(404).json({ error: "Notification not found" });
  if (req.session.user.role === "student" && n.studentId !== req.session.user.id) return res.status(403).json({ error: "Not yours" });
  if (req.session.user.role === "parent" && n.studentId !== req.session.user.studentId) return res.status(403).json({ error: "Not yours" });

  if (req.session.user.role === "student") n.studentSeen = true;
  if (req.session.user.role === "parent") n.parentSeen = true;
  db.save(data);
  res.json({ notification: n });
});

module.exports = router;
