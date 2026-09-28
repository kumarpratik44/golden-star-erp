# Golden Star International School - Student Portal

A working Node.js/Express backend + responsive frontend covering the core
requirements: secure per-user logins for Admin/Teacher/Student/Parent, student
records, attendance, results with real PDF download, and a
notification system (in-portal now, with a single hook point to add real
SMS/Email/WhatsApp later).

## 1. Run it (takes ~2 minutes)

You need [Node.js](https://nodejs.org) installed (v18 or newer).

```bash
cd golden-star-erp
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

The server needs internet access once, during `npm install`, to download its
3 dependencies (express, express-session, bcryptjs). After that it runs fully
offline.

## 2. Default admin login

- Go to `/login.html`, choose **Admin**
- Username: `admin`
- Password: `GoldenStar@2026`

**Change this password (or at least the `SESSION_SECRET`) before this ever
goes on a public server** — see "Before you go live" below.

## 3. Demo script for tomorrow

1. Log in as Admin.
2. **Students tab** → Add a student. Note the auto-generated Admission Number
   and the student + parent passwords shown on screen (only shown once, by
   design — that's the whole point of not storing plaintext passwords).
3. **Teachers tab** → Add a teacher, note their generated password.
4. **Results tab** → Post a result for the student you just added. This also
   creates a notification automatically.
5. **Attendance tab** → Mark today's attendance for the student.
6. Log out, log back in as that **Student** (use the Admission No + password
   from step 2) → show their results, the "Download Result as PDF" button
   (produces a real PDF), attendance, and the notice that just appeared.
7. Log out, log in as that **Parent** (same Admission No, parent password
   from step 2) → show they see the same result/notice — this is the
   "parent gets notified" requirement in action. Check the terminal where
   `npm start` is running — you'll see a `[PARENT ALERT -> ...]` log line,
   which is the hook where real SMS/WhatsApp/Email plugs in later.
8. Log in as **Teacher** → show they can also mark attendance and post
   results without needing the admin account.

## 4. What's implemented vs. what's next

**Implemented (matches the school owner's stated requirements):**
- Individual, securely hashed (bcrypt) logins for admin, teacher, every
  student and every parent — not shared passwords.
- Admin has full control: add/edit/delete students & teachers, reset
  passwords, post results, mark attendance, send notices — no developer
  needed for day-to-day use.
- Student records: admission number, admission year, class, section, DOB,
  parent details, full result & attendance history.
- Students can view and **download a real PDF** of their results.
- When a result or notice is posted, the student AND the linked parent
  automatically get an in-portal notification (marked "NEW" until viewed).
  The `lib/notifier.js` file is the single place to plug in a real SMS/Email/
  WhatsApp provider (Twilio, MSG91, Nodemailer, etc.) when you're ready — the
  rest of the app doesn't need to change.
- Fully responsive (phone/tablet/desktop) — tab bars scroll on small
  screens, tables scroll horizontally instead of breaking layout.
- The public `index.html` doubles as the school-website landing page you
  can link/embed from the main Golden Star website, with a "Login to Portal"
  button.

**Deliberately out of scope for this first build** (present in the old
prototype but not in the owner's must-have list — happy to build any of
these next):
- Fee/finance management, staff salary/HR, inventory, analytics/risk
  reports.
- Real SMS/Email/WhatsApp sending (currently logs to console — see above).
- Bulk CSV import of students, photo uploads, report-card templates with
  custom grading scales.

## 5. Before you actually go live (not just for tomorrow's demo)

- Change `SESSION_SECRET` in `server.js` (or set it as an environment
  variable) to a long random string.
- Change the default admin password immediately after first login (an
  "Change my password" admin option is a quick next addition).
- Put this behind HTTPS (any basic hosting provider — Render, Railway, a
  VPS with Caddy/Nginx — handles this for you).
- `data/db.json` is the entire database — back it up regularly. For a
  bigger school (a few hundred+ students), migrate to Postgres/MySQL;
  the `lib/db.js` file is written so that swap only touches one file.
