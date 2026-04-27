/**
 * pdfService.js
 * Generates a study plan PDF using PDFKit.
 * Returns a Buffer that can be streamed to the client.
 */

const PDFDocument = require('pdfkit');

// ─── Colors ───────────────────────────────────────────────────────────────────
const COLORS = {
  primary:   '#5b8df6',
  secondary: '#2dd4bf',
  text:      '#e2e8f0',
  muted:     '#94a3b8',
  bg:        '#1e2433',
  card:      '#252d3d',
  border:    '#2e3a52',
  completed: '#34d399',
  missed:    '#fb7185',
  revision:  '#fbbf24',
};

/**
 * generatePlanPDF
 * @param {Object} plan  — StudyPlan document
 * @param {Object} user  — User document
 * @returns {Promise<Buffer>}
 */
async function generatePlanPDF(plan, user) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    const chunks = [];

    doc.on('data',  (chunk) => chunks.push(chunk));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Cover page ──────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 200).fill('#1a2035');

    doc.fontSize(28).fillColor('#5b8df6').font('Helvetica-Bold')
      .text('StudyFlow', 50, 60);

    doc.fontSize(16).fillColor('#e2e8f0').font('Helvetica')
      .text('Personalised Study Plan', 50, 100);

    doc.fontSize(11).fillColor('#94a3b8')
      .text(`Generated for: ${user.fullName}`, 50, 130)
      .text(`Plan: ${plan.title}`, 50, 148)
      .text(`Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`, 50, 166);

    doc.moveDown(3);

    // ── Summary table ──────────────────────────────────────────────────────
    doc.fillColor('#e2e8f0').fontSize(13).font('Helvetica-Bold')
      .text('Plan Summary', 50, 220);

    doc.moveTo(50, 238).lineTo(545, 238).strokeColor('#2e3a52').lineWidth(1).stroke();
    doc.moveDown(0.5);

    const summaryRows = [
      ['Start Date',      new Date(plan.startDate).toLocaleDateString('en-US', { dateStyle: 'medium' })],
      ['End Date',        new Date(plan.endDate).toLocaleDateString('en-US',   { dateStyle: 'medium' })],
      ['Daily Hours',     `${plan.dailyHours}h / day`],
      ['Total Tasks',     String(plan.totalTasks)],
      ['Completed Tasks', String(plan.completedTasks)],
      ['Progress',        `${plan.totalTasks ? Math.round((plan.completedTasks / plan.totalTasks) * 100) : 0}%`],
      ['Version',         `v${plan.version}`],
      ['Status',          plan.status.charAt(0).toUpperCase() + plan.status.slice(1)],
    ];

    let rowY = 248;
    doc.fontSize(10).font('Helvetica');
    for (const [label, value] of summaryRows) {
      doc.fillColor('#94a3b8').text(label, 50, rowY);
      doc.fillColor('#e2e8f0').text(value, 200, rowY);
      rowY += 18;
    }

    // ── Days & Tasks ──────────────────────────────────────────────────────
    doc.addPage();
    doc.fontSize(14).fillColor('#5b8df6').font('Helvetica-Bold').text('Daily Schedule', 50, 50);
    doc.moveTo(50, 70).lineTo(545, 70).strokeColor('#2e3a52').stroke();

    let y = 85;

    for (const day of plan.days) {
      // Day header
      const dateStr = new Date(day.date).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      });
      const completedTasks = day.tasks.filter((t) => t.status === 'completed' || t.isCompleted).length;
      const pct = day.tasks.length
        ? Math.round((completedTasks / day.tasks.length) * 100) : 0;

      // Check space
      if (y > doc.page.height - 120) {
        doc.addPage();
        y = 50;
      }

      // Day box
      doc.rect(50, y, 495, 24).fill('#252d3d');
      doc.fontSize(10).fillColor('#5b8df6').font('Helvetica-Bold')
        .text(`Day ${day.dayNumber} — ${dateStr}${day.isRevisionDay ? ' ★ Revision' : ''}`, 58, y + 7);
      doc.fillColor('#94a3b8').font('Helvetica')
        .text(`${day.tasks.length} tasks  ·  ${day.totalHours}h  ·  ${pct}% done`, 350, y + 7);
      y += 28;

      // Tasks
      if (day.tasks.length === 0) {
        doc.fontSize(9).fillColor('#64748b').text('  No tasks', 60, y);
        y += 14;
      } else {
        for (const task of day.tasks) {
          if (y > doc.page.height - 60) {
            doc.addPage();
            y = 50;
          }

          const done   = task.status === 'completed' || task.isCompleted;
          const missed = task.status === 'missed';
          const bulletColor = done ? COLORS.completed : missed ? COLORS.missed :
            task.taskType === 'revision' ? COLORS.revision : COLORS.primary;

          doc.circle(62, y + 4, 3).fill(bulletColor);

          doc.fontSize(9)
            .fillColor(done ? '#64748b' : '#cbd5e1')
            .font(done ? 'Helvetica' : 'Helvetica')
            .text(
              `${task.topicName}`,
              70, y,
              { width: 250, lineBreak: false }
            );

          doc.fillColor('#64748b')
            .text(`${task.subjectName}`, 325, y, { width: 120, lineBreak: false })
            .text(`${task.duration}h`, 455, y)
            .text(done ? '✓' : missed ? '✗' : '○', 520, y);

          y += 14;
        }
      }
      y += 6;
    }

    // ── Footer ────────────────────────────────────────────────────────────
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#475569')
        .text(
          `StudyFlow · ${user.fullName} · Page ${i + 1} of ${pageCount}`,
          50, doc.page.height - 30,
          { align: 'center', width: doc.page.width - 100 }
        );
    }

    doc.end();
  });
}

module.exports = { generatePlanPDF };
