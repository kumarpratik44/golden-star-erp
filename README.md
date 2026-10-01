# Golden Star International School — Independent School Portal V2

This is a **single-school deployment** built specifically for Golden Star International School. It is intentionally independent: each school installation owns its own application and `data/db.json`.

## Core modules

- Public school landing page
- Admin portal
- Teacher portal
- Student portal
- Parent portal
- Individual student and parent credentials
- Student profile with photo upload
- Teacher profile with photo upload
- International parent phone numbers (no country-specific digit limit)
- Unique admission numbers
- Subject Master managed by Admin
- Class-wise subject assignment
- Teacher assignment to subjects
- Multi-subject examination results
- One complete report view per student + term + exam
- Automatic total, percentage and grade calculation
- Re-posting the same student/term/exam/subject updates that subject's marks instead of creating a duplicate
- Student result PDF download
- Attendance
- Timetable
- Holidays/events
- Teacher-published subject updates
- Parent/student portal notifications
- Admin password change
- JSON database with atomic writes
- Corrupt database backup before recovery

## Result design

A result is **not** treated as one isolated subject. The database stores individual subject marks, while the portal groups them into a complete report card:

`Student → Term → Exam → Multiple Subjects → Total / Percentage / Grade`

Subjects are selected from **Admin → Academic → Subject Master**. They are not hard-coded into the result form.

## Student identity

Student names are not used as unique identifiers. Each student receives a permanent admission number such as `GS20260001`. This allows two students with the same name to exist safely.

## Parent phone

Parent phone numbers are stored as international strings. Examples: `+254...`, `+91...`, `+44...`, `+1...`. There is no India-specific 10-digit restriction.

## Deliberately excluded

This portal does not replace the school's existing ERP and does not include:

- Fees / fee collection
- Accounting / finance
- Payroll / salary / HR
- Inventory
- Business analytics / risk dashboards

The scope is the secure digital portal requested by the school while the existing ERP remains untouched.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

### First login

- Username: `admin`
- Password: `GoldenStar@2026`

Change the admin password immediately after first login.

## Production checklist

1. Set a strong random `SESSION_SECRET`.
2. Change the default admin password.
3. Deploy behind HTTPS.
4. Keep `data/db.json` outside the public/static directory.
5. Back up the `data` folder regularly.
6. Test Admin, Teacher, Student and Parent login separately.
7. Test student/teacher photo upload.
8. Create Subject Master entries and assign teachers.
9. Test a multi-subject result for one student.
10. Confirm the parent receives the in-portal result notification.
11. Configure the school's real domain/subdomain and contact details.
12. Add SMS/WhatsApp/email delivery only if the school requests it; `lib/notifier.js` is the integration hook.

## Architecture

```text
Golden Star International School
        |
        +-- Public Website
        +-- Admin Portal
        +-- Teacher Portal
        +-- Student Portal
        +-- Parent Portal
        |
        +-- data/db.json   <-- this school's private database
```

A future school should be deployed as a separate copy with its own database. There is no shared multi-school tenant database in this product.
