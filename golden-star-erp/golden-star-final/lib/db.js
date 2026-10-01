// Single-school JSON database for Golden Star International School.
// This installation intentionally owns its own data/db.json. There is no
// shared tenant database, so a change/bug in one school's installation cannot
// modify another school's records.
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const DB_FILE = path.join(__dirname, "..", "data", "db.json");

function defaultData() {
  return {
    admin: {
      username: "admin",
      name: "Administrator",
      passwordHash: bcrypt.hashSync(process.env.DEFAULT_ADMIN_PASSWORD || "GoldenStar@2026", 10)
    },
    school: {
      name: "Golden Star International School",
      tagline: "Knowledge is power",
      address: "530100",
      phones: ["+254 798 176 687", "+254 111 316 354"],
      email: "goldenstarinternationalschool4@gmail.com",
      logo: "/assets/logo.jpg"
    },
    teachers: [],
    students: [],
    results: [],
    attendance: [],
    notifications: [],
    subjects: [],
    timetable: [],
    holidays: [],
    subjectContent: [],
    _seq: 1
  };
}

function ensureShape(data) {
  const fresh = defaultData();
  for (const key of ["teachers", "students", "results", "attendance", "notifications", "subjects", "timetable", "holidays", "subjectContent"]) {
    if (!Array.isArray(data[key])) data[key] = fresh[key];
  }
  if (!data.school) data.school = fresh.school;
  if (!data.admin || !data.admin.username || !data.admin.passwordHash || data.admin.passwordHash.includes("REPLACE_ON_FIRST_START")) data.admin = fresh.admin;
  if (!data._seq) data._seq = 1;
  return data;
}

function load() {
  if (!fs.existsSync(DB_FILE)) {
    const fresh = defaultData();
    save(fresh);
    return fresh;
  }
  try {
    return ensureShape(JSON.parse(fs.readFileSync(DB_FILE, "utf8")));
  } catch (e) {
    console.error("db.json could not be read. A fresh database will be created.", e);
    const fresh = defaultData();
    save(fresh);
    return fresh;
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, DB_FILE);
}

function nextId(data) {
  const id = data._seq || 1;
  data._seq = id + 1;
  return String(id);
}

module.exports = { load, save, nextId, DB_FILE };
