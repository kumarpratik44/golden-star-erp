// Simple, dependency-free JSON-file data layer.
// Good enough for a single small-school deployment; swap for Postgres/MySQL later
// by re-implementing the functions below with the same signatures.

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const DB_FILE = path.join(__dirname, "..", "data", "db.json");

function defaultData() {
  return {
    admin: {
      username: "admin",
      name: "Administrator",
      passwordHash: bcrypt.hashSync("GoldenStar@2026", 10)
    },
    teachers: [],
    students: [],
    results: [],
    attendance: [],
    notifications: [],
    _seq: 1
  };
}

function load() {
  if (!fs.existsSync(DB_FILE)) {
    save(defaultData());
  }
  const raw = fs.readFileSync(DB_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("db.json is corrupted, re-initializing with defaults.", e);
    const fresh = defaultData();
    save(fresh);
    return fresh;
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  // write to a temp file then rename -> avoids a half-written file if the
  // process crashes mid-write, which is what caused "corrupted data" bugs
  // in the old localStorage version.
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function nextId(data) {
  const id = data._seq || 1;
  data._seq = id + 1;
  return String(id);
}

module.exports = { load, save, nextId, DB_FILE };
