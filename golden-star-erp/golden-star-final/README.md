# Golden Star International School — School Portal

A **single-school** Node.js/Express portal built specifically for Golden Star International School.

This is intentionally **not a multi-school SaaS system**. Every school installation owns its own application folder and its own `data/db.json`. Changes made for one school therefore do not share a database with another school's installation.

## Included in this build

- Admin login and full day-to-day control
- Teacher login
- Individual student login
- Individual parent login linked to the student's record
- Student admission/profile records
- Attendance
- Results + student PDF result download
- Parent/student in-portal notifications
- Public school landing page
- Subjects and teacher assignment
- Timetable
- Holidays/events
- Teacher-published subject updates
- Admin password change
- Responsive phone/tablet/desktop UI
- Atomic JSON writes to reduce partial/corrupted-file risk

## Deliberately excluded

This Golden Star installation does **not** replace the school's existing ERP and does not include:

- Fees / fee collection
- Accounting / finance
- Payroll / salary / HR
- Inventory
- Business analytics / risk dashboards
- Other unrelated ERP modules

The portal is designed around the school's identified gap: a secure digital portal connected with the public school website while the existing ERP remains untouched.

## Database decision

The JSON database is intentional for the current deployment model. Golden Star gets its own `data/db.json` and there is no shared tenant database.

For a later school, copy the application as a separate installation and use that school's own database. If a particular school's volume eventually requires a relational database, that school can be migrated independently.

## Run

Requires Node.js 18+.

```bash
npm install
npm start
```

Open `http://localhost:3000`.

Default first-run admin:

- Username: `admin`
- Password: `GoldenStar@2026`

**Change the admin password immediately after first login.** Also set a strong `SESSION_SECRET` before public deployment.

## Production checklist

Before giving the live URL to the school:

1. Set a long random `SESSION_SECRET` environment variable.
2. Change the default admin password.
3. Deploy behind HTTPS.
4. Keep `data/db.json` outside public/static directories.
5. Schedule backups of the `data` folder.
6. Test student, parent, teacher and admin logins separately.
7. Test result posting and parent notification flow.
8. Confirm the school's own domain/subdomain and contact details.
9. Add a real SMS/WhatsApp/email provider only if the school requests it; the integration hook is isolated in `lib/notifier.js`.

## Product boundary

The core relationship is:

**Existing School ERP → remains untouched**

**Golden Star Portal → website + secure student/teacher/parent/admin access**

This keeps the implementation focused, easier to maintain and isolated from unrelated school-finance or payroll functionality.
