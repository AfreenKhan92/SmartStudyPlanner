/**
 * pdfService.js (Enhanced Version)
 * Generates a comprehensive study plan PDF with charts, analytics, and improved layout.
 * Returns a Buffer that can be streamed to the client.
 */

const PDFDocument = require('pdfkit');

// ─── Colors ───────────────────────────────────────────────────────────────────
const COLORS = {
  primary:   '#5b8df6',
  secondary: '#2dd4bf',
  text:      '#1e293b',
  textLight: '#64748b',
  muted:     '#94a3b8',
  bg:        '#ffffff',
  card:      '#f8fafc',
  border:    '#e2e8f0',
  completed: '#10b981',
  missed:    '#ef4444',
  revision:  '#f59e0b',
  accent:    '#8b5cf6',
};

/**
 * Helper: Draw a progress circle (for visual progress indicators)
 */
function drawProgressCircle(doc, x, y, radius, percentage, color, label) {
  const startAngle = -90;
  const endAngle = startAngle + (percentage / 100) * 360;
  
  // Background circle
  doc.circle(x, y, radius)
    .lineWidth(8)
    .strokeColor('#e2e8f0')
    .stroke();
  
  // Progress arc
  if (percentage > 0) {
    doc.save();
    const rad1 = (startAngle * Math.PI) / 180;
    const rad2 = (endAngle * Math.PI) / 180;
    
    // Draw arc manually
    doc.path(`M ${x + radius * Math.cos(rad1)},${y + radius * Math.sin(rad1)}`)
      .arc(x, y, radius, rad1, rad2)
      .lineWidth(8)
      .strokeColor(color)
      .stroke();
    doc.restore();
  }
  
  // Percentage text
  doc.fontSize(22)
    .fillColor(COLORS.text)
    .font('Helvetica-Bold')
    .text(`${Math.round(percentage)}%`, x - 30, y - 11, { width: 60, align: 'center' });
  
  // Label
  doc.fontSize(9)
    .fillColor(COLORS.textLight)
    .font('Helvetica')
    .text(label, x - 50, y + radius + 12, { width: 100, align: 'center' });
}

/**
 * Helper: Draw a horizontal bar chart
 */
function drawBarChart(doc, x, y, width, height, data, maxValue) {
  const barHeight = height / data.length;
  const padding = 4;
  
  data.forEach((item, i) => {
    const barY = y + i * barHeight;
    const barWidth = (item.value / maxValue) * width;
    
    // Background
    doc.rect(x, barY + padding, width, barHeight - padding * 2)
      .fillColor('#f1f5f9')
      .fill();
    
    // Bar
    if (barWidth > 0) {
      doc.rect(x, barY + padding, barWidth, barHeight - padding * 2)
        .fillColor(item.color || COLORS.primary)
        .fill();
    }
    
    // Label
    doc.fontSize(8)
      .fillColor(COLORS.text)
      .font('Helvetica')
      .text(item.label, x - 80, barY + barHeight / 2 - 4, { width: 75, align: 'right' });
    
    // Value
    doc.fontSize(7)
      .fillColor(COLORS.textLight)
      .text(item.valueLabel || `${item.value}h`, x + width + 5, barY + barHeight / 2 - 3);
  });
}

/**
 * Helper: Draw section header
 */
function drawSectionHeader(doc, title, y, icon = '') {
  doc.fontSize(16)
    .fillColor(COLORS.primary)
    .font('Helvetica-Bold')
    .text(`${icon} ${title}`, 50, y);
  
  doc.moveTo(50, y + 22)
    .lineTo(545, y + 22)
    .strokeColor(COLORS.border)
    .lineWidth(1.5)
    .stroke();
  
  return y + 35;
}

/**
 * Helper: Check if we need a new page
 */
function checkPageBreak(doc, currentY, requiredSpace) {
  if (currentY + requiredSpace > doc.page.height - 70) {
    doc.addPage();
    return 50;
  }
  return currentY;
}

/**
 * Main PDF Generation Function
 */
async function generatePlanPDF(plan, user) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      margin: 50, 
      size: 'A4', 
      bufferPages: true,
      info: {
        Title: `Study Plan - ${plan.title}`,
        Author: user.fullName,
        Subject: 'Personalised Study Plan',
      }
    });
    
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ════════════════════════════════════════════════════════════════════════
    // 📄 PAGE 1: COVER PAGE & OVERVIEW
    // ════════════════════════════════════════════════════════════════════════
    
    // Header banner
    doc.rect(0, 0, doc.page.width, 140)
      .fillAndStroke(COLORS.primary, COLORS.primary);
    
    // StudyFlow branding
    doc.fontSize(32)
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .text('StudyFlow', 50, 45);
    
    doc.fontSize(14)
      .fillColor('#e0e7ff')
      .font('Helvetica')
      .text('Your Personalised Study Plan', 50, 85);
    
    // User info box
    doc.roundedRect(50, 160, 495, 100, 8)
      .fillColor(COLORS.card)
      .fill();
    
    let infoY = 175;
    doc.fontSize(11)
      .fillColor(COLORS.textLight)
      .font('Helvetica')
      .text('Student:', 70, infoY);
    doc.fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .text(user.fullName, 160, infoY);
    
    infoY += 20;
    doc.fillColor(COLORS.textLight)
      .font('Helvetica')
      .text('Plan Name:', 70, infoY);
    doc.fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .text(plan.title, 160, infoY);
    
    infoY += 20;
    doc.fillColor(COLORS.textLight)
      .font('Helvetica')
      .text('Generated:', 70, infoY);
    doc.fillColor(COLORS.text)
      .font('Helvetica')
      .text(new Date().toLocaleDateString('en-US', { dateStyle: 'long' }), 160, infoY);
    
    infoY += 20;
    doc.fillColor(COLORS.textLight)
      .font('Helvetica')
      .text('Version:', 70, infoY);
    doc.fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .text(`v${plan.version}`, 160, infoY);
    
    // Key metrics with progress circles
    const overallPct = plan.totalTasks ? (plan.completedTasks / plan.totalTasks) * 100 : 0;
    const totalDays = plan.days.length;
    const completedDays = plan.days.filter(d => 
      d.tasks.every(t => t.isCompleted || t.status === 'completed')
    ).length;
    const daysPct = totalDays ? (completedDays / totalDays) * 100 : 0;
    
    drawSectionHeader(doc, 'Progress Overview', 285, '📊');
    
    // Three progress circles
    drawProgressCircle(doc, 150, 370, 45, overallPct, COLORS.completed, 'Tasks Complete');
    drawProgressCircle(doc, 297, 370, 45, daysPct, COLORS.primary, 'Days Complete');
    
    const hoursCompleted = plan.days
      .flatMap(d => d.tasks)
      .filter(t => t.isCompleted || t.status === 'completed')
      .reduce((sum, t) => sum + t.duration, 0);
    const totalHours = plan.days
      .flatMap(d => d.tasks)
      .reduce((sum, t) => sum + t.duration, 0);
    const hoursPct = totalHours ? (hoursCompleted / totalHours) * 100 : 0;
    
    drawProgressCircle(doc, 444, 370, 45, hoursPct, COLORS.secondary, 'Hours Complete');
    
    // Quick stats grid
    let statsY = 460;
    doc.fontSize(10)
      .fillColor(COLORS.textLight)
      .font('Helvetica')
      .text('Study Period:', 50, statsY);
    doc.fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .text(
        `${new Date(plan.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → ${new Date(plan.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        160, statsY
      );
    
    statsY += 18;
    doc.fillColor(COLORS.textLight)
      .font('Helvetica')
      .text('Daily Target:', 50, statsY);
    doc.fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .text(`${plan.dailyHours} hours/day`, 160, statsY);
    
    statsY += 18;
    doc.fillColor(COLORS.textLight)
      .font('Helvetica')
      .text('Total Tasks:', 50, statsY);
    doc.fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .text(`${plan.completedTasks} completed of ${plan.totalTasks}`, 160, statsY);
    
    statsY += 18;
    doc.fillColor(COLORS.textLight)
      .font('Helvetica')
      .text('Status:', 50, statsY);
    const statusColor = plan.status === 'active' ? COLORS.completed : 
                       plan.status === 'paused' ? COLORS.revision : COLORS.muted;
    doc.fillColor(statusColor)
      .font('Helvetica-Bold')
      .text(plan.status.charAt(0).toUpperCase() + plan.status.slice(1), 160, statsY);

    // ════════════════════════════════════════════════════════════════════════
    // 📄 PAGE 2: SUBJECT BREAKDOWN & ANALYTICS
    // ════════════════════════════════════════════════════════════════════════
    
    doc.addPage();
    let y = drawSectionHeader(doc, 'Subject Breakdown', 50, '📚');
    
    // Calculate subject statistics
    const subjectStats = {};
    plan.days.forEach(day => {
      day.tasks.forEach(task => {
        if (!subjectStats[task.subjectName]) {
          subjectStats[task.subjectName] = {
            name: task.subjectName,
            color: task.subjectColor || COLORS.primary,
            totalTasks: 0,
            completedTasks: 0,
            totalHours: 0,
            completedHours: 0,
            topics: new Set(),
          };
        }
        const stat = subjectStats[task.subjectName];
        stat.totalTasks++;
        stat.totalHours += task.duration;
        stat.topics.add(task.topicName);
        
        if (task.isCompleted || task.status === 'completed') {
          stat.completedTasks++;
          stat.completedHours += task.duration;
        }
      });
    });
    
    const subjects = Object.values(subjectStats);
    
    // Subject cards
    subjects.forEach((subj, idx) => {
      y = checkPageBreak(doc, y, 110);
      
      const cardHeight = 95;
      const pct = subj.totalTasks ? (subj.completedTasks / subj.totalTasks) * 100 : 0;
      
      // Card background
      doc.roundedRect(50, y, 495, cardHeight, 6)
        .fillColor(COLORS.card)
        .fill();
      
      // Left color bar
      doc.rect(50, y, 4, cardHeight)
        .fillColor(subj.color)
        .fill();
      
      // Subject name
      doc.fontSize(13)
        .fillColor(COLORS.text)
        .font('Helvetica-Bold')
        .text(subj.name, 70, y + 15);
      
      // Topics count
      doc.fontSize(8)
        .fillColor(COLORS.textLight)
        .font('Helvetica')
        .text(`${subj.topics.size} topics`, 70, y + 35);
      
      // Progress bar
      const barY = y + 55;
      const barWidth = 380;
      doc.rect(70, barY, barWidth, 8)
        .fillColor('#e2e8f0')
        .fill();
      
      if (pct > 0) {
        doc.rect(70, barY, (pct / 100) * barWidth, 8)
          .fillColor(subj.color)
          .fill();
      }
      
      doc.fontSize(8)
        .fillColor(COLORS.text)
        .font('Helvetica-Bold')
        .text(`${Math.round(pct)}%`, 455, barY);
      
      // Stats row
      const statsRowY = y + 72;
      doc.fontSize(8)
        .fillColor(COLORS.textLight)
        .font('Helvetica')
        .text(`Tasks: ${subj.completedTasks}/${subj.totalTasks}`, 70, statsRowY);
      
      doc.text(`Hours: ${subj.completedHours.toFixed(1)}/${subj.totalHours.toFixed(1)}h`, 200, statsRowY);
      
      const remainingHours = subj.totalHours - subj.completedHours;
      if (remainingHours > 0) {
        doc.fillColor(COLORS.revision)
          .text(`${remainingHours.toFixed(1)}h remaining`, 350, statsRowY);
      } else {
        doc.fillColor(COLORS.completed)
          .text('✓ Complete', 350, statsRowY);
      }
      
      y += cardHeight + 10;
    });
    
    // ════════════════════════════════════════════════════════════════════════
    // 📄 PAGE 3: STUDY TIME ANALYTICS
    // ════════════════════════════════════════════════════════════════════════
    
    doc.addPage();
    y = drawSectionHeader(doc, 'Study Time Analytics', 50, '⏱️');
    
    // Time distribution by subject (bar chart)
    doc.fontSize(11)
      .fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .text('Time Allocation by Subject', 50, y + 5);
    
    const maxHours = Math.max(...subjects.map(s => s.totalHours));
    const chartData = subjects.map(s => ({
      label: s.name.length > 12 ? s.name.substring(0, 12) + '...' : s.name,
      value: s.totalHours,
      valueLabel: `${s.totalHours.toFixed(1)}h`,
      color: s.color,
    }));
    
    drawBarChart(doc, 140, y + 30, 350, subjects.length * 30, chartData, maxHours);
    
    y += subjects.length * 30 + 70;
    
    // Weekly breakdown
    y = checkPageBreak(doc, y, 200);
    
    doc.fontSize(11)
      .fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .text('Weekly Study Pattern', 50, y);
    
    // Group days by week
    const weeklyData = {};
    plan.days.forEach(day => {
      const weekNum = Math.floor(day.dayNumber / 7) + 1;
      if (!weeklyData[weekNum]) {
        weeklyData[weekNum] = { totalHours: 0, completedHours: 0, tasks: 0, completedTasks: 0 };
      }
      weeklyData[weekNum].totalHours += day.totalHours;
      weeklyData[weekNum].tasks += day.tasks.length;
      day.tasks.forEach(t => {
        if (t.isCompleted || t.status === 'completed') {
          weeklyData[weekNum].completedHours += t.duration;
          weeklyData[weekNum].completedTasks++;
        }
      });
    });
    
    y += 25;
    
    // Weekly table
    Object.entries(weeklyData).forEach(([week, data], idx) => {
      y = checkPageBreak(doc, y, 25);
      
      const bgColor = idx % 2 === 0 ? COLORS.card : '#ffffff';
      doc.rect(50, y, 495, 22)
        .fillColor(bgColor)
        .fill();
      
      doc.fontSize(9)
        .fillColor(COLORS.text)
        .font('Helvetica-Bold')
        .text(`Week ${week}`, 65, y + 6);
      
      doc.font('Helvetica')
        .text(`${data.totalHours.toFixed(1)}h planned`, 180, y + 6);
      
      doc.fillColor(COLORS.completed)
        .text(`${data.completedHours.toFixed(1)}h done`, 300, y + 6);
      
      const weekPct = data.totalHours ? Math.round((data.completedHours / data.totalHours) * 100) : 0;
      doc.fillColor(COLORS.textLight)
        .text(`${weekPct}% complete`, 420, y + 6);
      
      y += 22;
    });
    
    // Study pace insights
    y += 20;
    y = checkPageBreak(doc, y, 120);
    
    doc.roundedRect(50, y, 495, 100, 8)
      .fillColor('#fef3c7')
      .fill();
    
    doc.fontSize(11)
      .fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .text('💡 Study Insights', 70, y + 15);
    
    const avgDailyHours = totalHours / totalDays;
    const avgCompletedDaily = hoursCompleted / (completedDays || 1);
    
    doc.fontSize(9)
      .fillColor(COLORS.textLight)
      .font('Helvetica')
      .text(
        `• Average daily workload: ${avgDailyHours.toFixed(1)} hours\n` +
        `• Your daily completion rate: ${avgCompletedDaily.toFixed(1)} hours\n` +
        `• Total study hours planned: ${totalHours.toFixed(1)} hours\n` +
        `• Hours remaining: ${(totalHours - hoursCompleted).toFixed(1)} hours\n` +
        `• Estimated completion: ${overallPct >= 100 ? 'Completed! 🎉' : `${Math.ceil((100 - overallPct) * totalDays / 100)} days remaining`}`,
        70, y + 40,
        { lineGap: 4 }
      );

    // ════════════════════════════════════════════════════════════════════════
    // 📄 PAGES 4+: DAILY SCHEDULE (Organized by Subject)
    // ════════════════════════════════════════════════════════════════════════
    
    doc.addPage();
    y = drawSectionHeader(doc, 'Daily Study Schedule', 50, '📅');
    
    doc.fontSize(9)
      .fillColor(COLORS.textLight)
      .font('Helvetica-Oblique')
      .text('Organized by subject for efficient planning', 50, y);
    
    y += 25;
    
    for (const day of plan.days) {
      y = checkPageBreak(doc, y, 150);
      
      // Day header
      const dateStr = new Date(day.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      
      const completedTasksCount = day.tasks.filter(t => t.isCompleted || t.status === 'completed').length;
      const dayPct = day.tasks.length ? Math.round((completedTasksCount / day.tasks.length) * 100) : 0;
      
      // Day card
      doc.roundedRect(50, y, 495, 35, 6)
        .fillColor(COLORS.primary)
        .fill();
      
      doc.fontSize(12)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text(`Day ${day.dayNumber}`, 65, y + 9);
      
      doc.fontSize(11)
        .font('Helvetica')
        .text(dateStr, 120, y + 9);
      
      if (day.isRevisionDay) {
        doc.fontSize(9)
          .text('⭐ Revision Day', 350, y + 11);
      }
      
      doc.fontSize(9)
        .fillColor('#e0e7ff')
        .text(`${day.totalHours}h · ${day.tasks.length} tasks · ${dayPct}% done`, 65, y + 24);
      
      y += 45;
      
      // Group tasks by subject
      const tasksBySubject = {};
      day.tasks.forEach(task => {
        if (!tasksBySubject[task.subjectName]) {
          tasksBySubject[task.subjectName] = [];
        }
        tasksBySubject[task.subjectName].push(task);
      });
      
      // Render tasks by subject
      Object.entries(tasksBySubject).forEach(([subjectName, tasks]) => {
        y = checkPageBreak(doc, y, tasks.length * 20 + 30);
        
        // Subject divider
        const subjColor = tasks[0].subjectColor || COLORS.primary;
        doc.fontSize(10)
          .fillColor(subjColor)
          .font('Helvetica-Bold')
          .text(`${subjectName}`, 60, y);
        
        y += 18;
        
        // Tasks
        tasks.forEach(task => {
          const done = task.isCompleted || task.status === 'completed';
          const missed = task.status === 'missed';
          
          const bulletColor = done ? COLORS.completed : 
                             missed ? COLORS.missed :
                             task.taskType === 'revision' ? COLORS.revision : 
                             COLORS.primary;
          
          // Checkbox/bullet
          if (done) {
            doc.circle(73, y + 5, 4)
              .fillColor(COLORS.completed)
              .fill();
            doc.fontSize(7)
              .fillColor('#ffffff')
              .text('✓', 70.5, y + 2);
          } else {
            doc.circle(73, y + 5, 4)
              .strokeColor(bulletColor)
              .lineWidth(1.5)
              .stroke();
          }
          
          // Task text
          doc.fontSize(9)
            .fillColor(done ? COLORS.textLight : COLORS.text)
            .font(done ? 'Helvetica' : 'Helvetica')
            .text(
              task.topicName,
              85, y,
              { width: 320, lineBreak: false, strikethrough: done }
            );
          
          // Duration
          doc.fontSize(8)
            .fillColor(COLORS.muted)
            .text(`${task.duration}h`, 420, y);
          
          // Type badge
          if (task.taskType === 'revision') {
            doc.fontSize(7)
              .fillColor(COLORS.revision)
              .text('REVISION', 465, y + 1);
          } else if (done) {
            doc.fontSize(7)
              .fillColor(COLORS.completed)
              .text('DONE', 475, y + 1);
          } else if (missed) {
            doc.fontSize(7)
              .fillColor(COLORS.missed)
              .text('MISSED', 470, y + 1);
          }
          
          y += 18;
        });
        
        y += 8;
      });
      
      y += 10;
    }

    // ════════════════════════════════════════════════════════════════════════
    // 📄 FOOTER ON ALL PAGES
    // ════════════════════════════════════════════════════════════════════════
    
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Footer line
      doc.moveTo(50, doc.page.height - 45)
        .lineTo(545, doc.page.height - 45)
        .strokeColor(COLORS.border)
        .lineWidth(0.5)
        .stroke();
      
      // Footer text
      doc.fontSize(8)
        .fillColor(COLORS.textLight)
        .font('Helvetica')
        .text(
          `StudyFlow Study Plan · ${user.fullName} · ${plan.title}`,
          50, doc.page.height - 32,
          { width: 300 }
        );
      
      doc.text(
        `Page ${i + 1} of ${pageCount}`,
        0, doc.page.height - 32,
        { width: doc.page.width - 50, align: 'right' }
      );
    }

    doc.end();
  });
}

module.exports = { generatePlanPDF };