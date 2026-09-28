// Single-school notification hook.
// The portal notification is stored by the caller. This hook is deliberately
// isolated so a future SMS/WhatsApp/email provider can be added without
// changing the school portal logic.
function sendParentAlert(student, message) {
  if (!student || !student.parentPhone) return;
  console.log(`[PARENT ALERT -> ${student.parentName || "Parent"} (${student.parentPhone})] ${message}`);
}
module.exports = { sendParentAlert };
