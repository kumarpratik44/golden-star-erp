const express = require("express");
const db = require("../lib/db");
const { requireRole } = require("../lib/auth");

const router = express.Router();

function upsertAttendance(data, studentId, date, status) {
  let record = data.attendance.find(a => a.studentId === studentId && a.date === date);
  if (record) {
    record.status = status;
  } else {
    record = { id: db.nextId(data), studentId, date, status };
    data.attendance.push(record);
  }
  return record;
}

// Admin/teacher: mark attendance for one student on one date
router.post("/", requireRole("admin", "teacher"), (req, res) => {
  const { studentId, date, status } = req.body;
  if (!studentId || !date || !status) return res.status(400).json({ error: "studentId, date, status are required" });
  const data = db.load();
  const record = upsertAttendance(data, studentId, date, status);
  db.save(data);
  res.json({ record });
});

// Admin/teacher: mark attendance for a whole class on one date in one go
router.post("/bulk", requireRole("admin", "teacher"), (req, res) => {
  const { date, records } = req.body; // records: [{studentId, status}]
  if (!date || !Array.isArray(records)) return res.status(400).json({ error: "date and records[] are required" });
  const data = db.load();
  const saved = records.map(r => upsertAttendance(data, r.studentId, date, r.status));
  db.save(data);
  res.json({ records: saved });
});

router.get("/student/:studentId", requireRole("admin", "teacher"), (req, res) => {
  const data = db.load();
  const records = data.attendance.filter(a => a.studentId === req.params.studentId);
  res.json({ records });
});

router.get("/mine", requireRole("student"), (req, res) => {
  const data = db.load();
  const records = data.attendance.filter(a => a.studentId === req.session.user.id);
  res.json({ records });
});

router.get("/parent", requireRole("parent"), (req, res) => {
  const data = db.load();
  const records = data.attendance.filter(a => a.studentId === req.session.user.studentId);
  res.json({ records });
});

module.exports = router;
