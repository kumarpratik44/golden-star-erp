const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../lib/db");
const { requireRole } = require("../lib/auth");

const router = express.Router();

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1 confusion
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function genAdmissionNo(data, admissionYear) {
  const year = admissionYear || new Date().getFullYear();
  const countThisYear = data.students.filter(s => s.admissionYear === year).length + 1;
  return `GS${year}${String(countThisYear).padStart(3, "0")}`;
}

function publicStudent(s) {
  const { passwordHash, parentPasswordHash, ...rest } = s;
  return rest;
}

// Logged-in student/parent profile
router.get("/mine", requireRole("student"), (req, res) => {
  const data = db.load();
  const student = data.students.find(s => s.id === req.session.user.id);
  if (!student) return res.status(404).json({ error: "Student not found" });
  res.json({ student: publicStudent(student) });
});

router.get("/parent", requireRole("parent"), (req, res) => {
  const data = db.load();
  const student = data.students.find(s => s.id === req.session.user.studentId);
  if (!student) return res.status(404).json({ error: "Student not found" });
  res.json({ student: publicStudent(student) });
});

// Admin: list all students
router.get("/", requireRole("admin", "teacher"), (req, res) => {
  const data = db.load();
  let list = data.students;
  if (req.session.user.role === "teacher") {
    const teacher = data.teachers.find(t => t.id === req.session.user.id);
    if (teacher && teacher.className) list = list.filter(s => String(s.className).trim() === String(teacher.className).trim());
  }
  res.json({ students: list.map(publicStudent) });
});

// Admin: create a student. Auto-generates admission number + individual
// student & parent passwords, returned ONCE in plaintext so admin can share them.
router.post("/", requireRole("admin"), (req, res) => {
  const { name, className, section, dob, admissionYear, gender, address, parentName, parentPhone, parentEmail } = req.body;
  if (!name || !className) {
    return res.status(400).json({ error: "name and className are required" });
  }
  const data = db.load();
  const year = admissionYear ? Number(admissionYear) : new Date().getFullYear();
  const admissionNo = genAdmissionNo(data, year);

  const studentPassword = genPassword();
  const parentPassword = genPassword();

  const student = {
    id: db.nextId(data),
    admissionNo,
    name,
    className,
    section: section || "A",
    dob: dob || "",
    admissionYear: year,
    gender: gender || "",
    address: address || "",
    parentName: parentName || "",
    parentPhone: parentPhone || "",
    parentEmail: parentEmail || "",
    passwordHash: bcrypt.hashSync(studentPassword, 10),
    parentPasswordHash: bcrypt.hashSync(parentPassword, 10),
    createdAt: new Date().toISOString()
  };

  data.students.push(student);
  db.save(data);

  res.json({
    student: publicStudent(student),
    credentials: {
      studentLogin: { admissionNo, password: studentPassword },
      parentLogin: { admissionNo, password: parentPassword }
    }
  });
});

// Admin: update a student's details
router.put("/:id", requireRole("admin"), (req, res) => {
  const data = db.load();
  const student = data.students.find(s => s.id === req.params.id);
  if (!student) return res.status(404).json({ error: "Student not found" });

  const editable = ["name", "className", "section", "dob", "gender", "address", "parentName", "parentPhone", "parentEmail"];
  for (const key of editable) {
    if (req.body[key] !== undefined) student[key] = req.body[key];
  }
  db.save(data);
  res.json({ student: publicStudent(student) });
});

// Admin: delete a student
router.delete("/:id", requireRole("admin"), (req, res) => {
  const data = db.load();
  const before = data.students.length;
  data.students = data.students.filter(s => s.id !== req.params.id);
  if (data.students.length === before) return res.status(404).json({ error: "Student not found" });
  db.save(data);
  res.json({ ok: true });
});

// Admin: reset a student's or parent's password, returns new plaintext once
router.post("/:id/reset-password", requireRole("admin"), (req, res) => {
  const { target } = req.body; // "student" or "parent"
  const data = db.load();
  const student = data.students.find(s => s.id === req.params.id);
  if (!student) return res.status(404).json({ error: "Student not found" });

  const newPassword = genPassword();
  if (target === "parent") {
    student.parentPasswordHash = bcrypt.hashSync(newPassword, 10);
  } else {
    student.passwordHash = bcrypt.hashSync(newPassword, 10);
  }
  db.save(data);
  res.json({ admissionNo: student.admissionNo, target: target === "parent" ? "parent" : "student", newPassword });
});

module.exports = router;
