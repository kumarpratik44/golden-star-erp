// Parent alert hook.
//
// Right now this just logs to the server console and records an in-portal
// notification (handled by the caller) - so the "parent gets notified" flow
// is fully wired end-to-end, but no real SMS/Email is sent yet.
//
// To send a REAL SMS/WhatsApp/Email, replace the body of sendParentAlert()
// with a call to your provider, e.g.:
//   - Twilio / MSG91 / Fast2SMS for SMS
//   - Nodemailer + Gmail/SMTP for email
//   - WhatsApp Cloud API for WhatsApp
// Everywhere else in the app stays the same - only this file needs to change.

function sendParentAlert(student, message) {
  if (!student || !student.parentPhone) return;
  console.log(`[PARENT ALERT -> ${student.parentName || "Parent"} (${student.parentPhone})] ${message}`);
  // TODO: plug in real SMS/Email/WhatsApp provider here.
}

module.exports = { sendParentAlert };
