const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../lib/db");

const router = express.Router();

router.post("/login", (req, res) => {
  const { role, username, password } = req.body;
  if (!role || !username || !password) {
    return res.status(400).json({ error: "Missing role, username or password" });
  }
  const data = db.load();

  if (role === "admin") {
    if (username === data.admin.username && bcrypt.compareSync(password, data.admin.passwordHash)) {
      req.session.user = { role: "admin", name: data.admin.name };
      return res.json({ user: req.session.user });
    }
    return res.status(401).json({ error: "Invalid admin credentials" });
  }

  if (role === "teacher") {
    const teacher = data.teachers.find(t => t.phone === username);
    if (teacher && bcrypt.compareSync(password, teacher.passwordHash)) {
      req.session.user = { role: "teacher", id: teacher.id, name: teacher.name };
      return res.json({ user: req.session.user });
    }
    return res.status(401).json({ error: "Invalid teacher credentials" });
  }

  if (role === "student") {
    const student = data.students.find(s => s.admissionNo === username);
    if (student && bcrypt.compareSync(password, student.passwordHash)) {
      req.session.user = { role: "student", id: student.id, name: student.name };
      return res.json({ user: req.session.user });
    }
    return res.status(401).json({ error: "Invalid student credentials" });
  }

  if (role === "parent") {
    const student = data.students.find(s => s.admissionNo === username);
    if (student && student.parentPasswordHash && bcrypt.compareSync(password, student.parentPasswordHash)) {
      req.session.user = { role: "parent", studentId: student.id, name: student.parentName || "Parent" };
      return res.json({ user: req.session.user });
    }
    return res.status(401).json({ error: "Invalid parent credentials" });
  }

  return res.status(400).json({ error: "Unknown role" });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get("/me", (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
  res.json({ user: req.session.user });
});

module.exports = router;
