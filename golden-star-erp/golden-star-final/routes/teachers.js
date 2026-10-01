const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../lib/db");
const { requireRole } = require("../lib/auth");

const router = express.Router();

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function publicTeacher(t) {
  const { passwordHash, ...rest } = t;
  return rest;
}

router.get("/", requireRole("admin"), (req, res) => {
  const data = db.load();
  res.json({ teachers: data.teachers.map(publicTeacher) });
});

router.post("/", requireRole("admin"), (req, res) => {
  const { name, phone, subject, className } = req.body;
  if (!name || !phone) return res.status(400).json({ error: "name and phone are required" });

  const data = db.load();
  if (data.teachers.some(t => t.phone === phone)) {
    return res.status(400).json({ error: "A teacher with this phone number already exists" });
  }
  const password = genPassword();
  const teacher = {
    id: db.nextId(data),
    name,
    phone,
    subject: subject || "",
    className: className || "",
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString()
  };
  data.teachers.push(teacher);
  db.save(data);
  res.json({ teacher: publicTeacher(teacher), credentials: { phone, password } });
});

router.put("/:id", requireRole("admin"), (req, res) => {
  const data = db.load();
  const teacher = data.teachers.find(t => t.id === req.params.id);
  if (!teacher) return res.status(404).json({ error: "Teacher not found" });
  for (const key of ["name", "phone", "subject", "className"]) {
    if (req.body[key] !== undefined) teacher[key] = req.body[key];
  }
  db.save(data);
  res.json({ teacher: publicTeacher(teacher) });
});

router.delete("/:id", requireRole("admin"), (req, res) => {
  const data = db.load();
  const before = data.teachers.length;
  data.teachers = data.teachers.filter(t => t.id !== req.params.id);
  if (data.teachers.length === before) return res.status(404).json({ error: "Teacher not found" });
  db.save(data);
  res.json({ ok: true });
});

router.post("/:id/reset-password", requireRole("admin"), (req, res) => {
  const data = db.load();
  const teacher = data.teachers.find(t => t.id === req.params.id);
  if (!teacher) return res.status(404).json({ error: "Teacher not found" });
  const newPassword = genPassword();
  teacher.passwordHash = bcrypt.hashSync(newPassword, 10);
  db.save(data);
  res.json({ phone: teacher.phone, newPassword });
});

module.exports = router;
