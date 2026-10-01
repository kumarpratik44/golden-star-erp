const express = require("express");
const session = require("express-session");
const path = require("path");

const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/students");
const teacherRoutes = require("./routes/teachers");
const resultRoutes = require("./routes/results");
const attendanceRoutes = require("./routes/attendance");
const notificationRoutes = require("./routes/notifications");
const schoolRoutes = require("./routes/school");

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy is required for Render, Heroku, or any reverse proxy / tunnel
app.set("trust proxy", 1);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "golden-star-single-school-change-this-secret",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 8,
      httpOnly: true,
      sameSite: "lax",
      // Render par HTTPS use hota hai, isiliye production/Render par secure true hona chahiye
      secure: process.env.NODE_ENV === "production" || process.env.RENDER ? true : false
    }
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/school", schoolRoutes);

app.use(express.static(path.join(__dirname, "public")));

// Any unmatched route -> serve the SPA-ish index so deep links don't 404
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Global error handler so one bad request can't crash the whole server
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

process.on("uncaughtException", err => console.error("Uncaught exception:", err));
process.on("unhandledRejection", err => console.error("Unhandled rejection:", err));

app.listen(PORT, () => {
  console.log(`Golden Star International School portal running at http://localhost:${PORT}`);
  console.log(`Default admin login -> username: admin | password: GoldenStar@2026`);
});