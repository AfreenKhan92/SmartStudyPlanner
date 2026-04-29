/**
 * emailService.js
 * Sends transactional emails via Nodemailer (SMTP).
 * Gracefully skips if SMTP credentials are not configured.
 */

const nodemailer = require('nodemailer');

// ─── Build transporter lazily ─────────────────────────────────────────────────
let _transporter = null;
function getTransporter() {
  if (_transporter) return _transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null; // Not configured
  }

  _transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   parseInt(SMTP_PORT || '587', 10),
    secure: SMTP_SECURE === 'true',
    auth:   { user: SMTP_USER, pass: SMTP_PASS },
  });

  return _transporter;
}

const FROM = process.env.EMAIL_FROM || 'StudyFlow <no-reply@studyflow.local>';

// ─── Generic send helper ──────────────────────────────────────────────────────
async function sendMail({ to, subject, html, text }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[emailService] SMTP not configured. Would send to ${to}: ${subject}`);
    return { skipped: true };
  }

  const info = await transporter.sendMail({ from: FROM, to, subject, html, text });
  console.log(`[emailService] Sent "${subject}" to ${to} — ${info.messageId}`);
  return info;
}

// ─── Email templates ──────────────────────────────────────────────────────────

/**
 * Send daily study reminder
 */
async function sendDailyReminder(user, todayTasks) {
  const taskList = todayTasks
    .map((t) => `<li><strong>${t.topicName}</strong> — ${t.subjectName} (${t.duration}h)</li>`)
    .join('');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#5b8df6">📚 Your Study Plan for Today</h2>
      <p>Hi <strong>${user.fullName}</strong>,</p>
      <p>Here are your tasks for today:</p>
      <ul>${taskList || '<li>No tasks scheduled today.</li>'}</ul>
      <p>Stay focused and keep up the great work!</p>
      <p style="color:#999;font-size:12px">— StudyFlow Team</p>
    </div>
  `;

  return sendMail({
    to:      user.email,
    subject: `📚 StudyFlow — Today's Study Plan (${todayTasks.length} tasks)`,
    html,
    text:    `Hi ${user.fullName}, you have ${todayTasks.length} tasks today. Log in to StudyFlow to view them.`,
  });
}

/**
 * Send missed tasks alert
 */
async function sendMissedTasksAlert(user, missedCount, planTitle) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#fb7185">⚠️ Missed Tasks Detected</h2>
      <p>Hi <strong>${user.fullName}</strong>,</p>
      <p>You missed <strong>${missedCount} task(s)</strong> from yesterday's plan (<em>${planTitle}</em>).</p>
      <p>The good news: StudyFlow has automatically rescheduled them into your upcoming days.</p>
      <p>Log in to review your updated schedule.</p>
      <p style="color:#999;font-size:12px">— StudyFlow Team</p>
    </div>
  `;

  return sendMail({
    to:      user.email,
    subject: `⚠️ StudyFlow — ${missedCount} missed task(s) rescheduled`,
    html,
    text:    `Hi ${user.fullName}, you missed ${missedCount} tasks. They've been rescheduled automatically.`,
  });
}

/**
 * Send weekly progress summary
 */
async function sendWeeklyDigest(user, stats) {
  const { completedTasks, totalTasks, currentStreak, progressPercentage } = stats;
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#5b8df6">📊 Your Weekly Study Digest</h2>
      <p>Hi <strong>${user.fullName}</strong>, here's how you did this week:</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px;border-bottom:1px solid #eee">Tasks Completed</td><td style="padding:8px;font-weight:bold">${completedTasks} / ${totalTasks}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee">Overall Progress</td><td style="padding:8px;font-weight:bold">${progressPercentage}%</td></tr>
        <tr><td style="padding:8px">Current Streak</td><td style="padding:8px;font-weight:bold">🔥 ${currentStreak} days</td></tr>
      </table>
      <p style="color:#999;font-size:12px">— StudyFlow Team</p>
    </div>
  `;

  return sendMail({
    to:      user.email,
    subject: `📊 StudyFlow Weekly Digest — ${progressPercentage}% complete`,
    html,
    text:    `Weekly digest: ${completedTasks}/${totalTasks} tasks, ${progressPercentage}% complete, ${currentStreak} day streak.`,
  });
}

/**
 * Send exam approaching alert
 */
async function sendExamAlert(user, subjectName, daysLeft) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#fbbf24">📅 Exam Coming Up!</h2>
      <p>Hi <strong>${user.fullName}</strong>,</p>
      <p>Your exam for <strong>${subjectName}</strong> is in <strong>${daysLeft} day(s)</strong>.</p>
      <p>Make sure you're on track with your study plan. Log in to review your progress.</p>
      <p style="color:#999;font-size:12px">— StudyFlow Team</p>
    </div>
  `;

  return sendMail({
    to:      user.email,
    subject: `📅 StudyFlow — ${subjectName} exam in ${daysLeft} day(s)!`,
    html,
    text:    `Your ${subjectName} exam is in ${daysLeft} days. Log in to review your plan.`,
  });
}

module.exports = {
  sendMail,
  sendDailyReminder,
  sendMissedTasksAlert,
  sendWeeklyDigest,
  sendExamAlert,
};
