import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from './format';
import { saveBlob } from './fileSave';

const STATUS_COLORS = {
  present: { fill: [74, 222, 128], text: [6, 78, 59] },
  absent: { fill: [248, 113, 113], text: [127, 29, 29] },
  late: { fill: [251, 146, 60], text: [124, 45, 18] },
  excused: { fill: [96, 165, 250], text: [30, 58, 138] },
};

const LEGEND = [
  { status: 'present', label: 'Present' },
  { status: 'absent', label: 'Absent' },
  { status: 'late', label: 'Late' },
  { status: 'excused', label: 'Excused' },
];

const RATE_COLOR = { fill: [253, 224, 71], text: [113, 63, 18] };

const shortDate = (d) => (d ? String(d).slice(5).replace('-', '/') : '');

/**
 * Build the status-matrix used for the colorful date-grid layout.
 * Also returns the sorted list of session dates.
 */
export function buildMatrix(rows, records) {
  const dates = [...new Set((records || []).map((r) => r.date))].sort();
  const byStudent = {};
  for (const r of records || []) {
    if (!byStudent[r.studentId]) byStudent[r.studentId] = {};
    byStudent[r.studentId][r.date] = r.status;
  }
  const statusByDate = (studentId) => byStudent[studentId] || {};
  return { dates, statusByDate };
}

/**
 * Generate a clean professional attendance PDF report.
 *
 * When `records` is provided (per-student per-date entries), the PDF uses a
 * colorful date-grid layout: session dates across the top, each cell shaded
 * by status (green=present, red=absent, orange=late, blue=excused) and the
 * Rate column highlighted in yellow. A legend is included above the table.
 */
export async function exportAttendancePDF({
  title = 'CLASS ATTENDANCE REPORT',
  meta = {},
  rows = [],
  total = {},
  records = [],
  signature = '',
  signatureWidth = 0,
  signatureHeight = 0,
  fileName = 'Attendance_Report.pdf',
}) {
  const useMatrix = Array.isArray(records) && (records.length > 0 || (rows && rows.length > 0));
  const doc = new jsPDF({ orientation: useMatrix ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const margin = useMatrix ? 28 : 40;
  let y = 44;

  const drawBlueRule = (yy) => {
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(1.4);
    doc.line(margin, yy, pageWidth - margin, yy);
  };

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(useMatrix ? 16 : 18);
  doc.setTextColor(30, 41, 59);
  doc.text(title, margin, y);
  y += 6;
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  const metaPairs = [
    ['Subject', meta.subjectName || '—'],
    ['Section', meta.section || '—'],
    ['Instructor', meta.instructor || '—'],
    ['School Year', meta.schoolYear || '—'],
    ['Semester', meta.semester || '—'],
    ['Room', meta.room || '—'],
    ['Date Range', meta.dateRange || '—'],
    ['Date Generated', formatDate(new Date())],
  ];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(useMatrix ? 9 : 10);
  doc.setTextColor(30, 41, 59);
  const leftStart = margin;
  doc.text('Class Information', leftStart, y);
  y += 13;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(useMatrix ? 8 : 9);
  doc.setTextColor(71, 85, 105);
  const colPad = useMatrix ? 250 : 280;
  let metaX = leftStart;
  let metaY = y;
  metaPairs.forEach(([k, v], idx) => {
    if (idx % 2 === 0 && idx > 0) {
      metaX = leftStart;
      metaY += 14;
    } else if (idx % 2 === 1) {
      metaX = leftStart + colPad;
    } else {
      metaX = leftStart;
    }
    doc.text(`${k}:`, metaX, metaY);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(String(v), metaX + 76, metaY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
  });
  y = metaY + (useMatrix ? 24 : 28);

  // Attendance Summary (centered, with blue rules above and below)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(useMatrix ? 10 : 11);
  doc.setTextColor(30, 41, 59);
  doc.text('Attendance Summary', pageWidth / 2, y, { align: 'center' });
  drawBlueRule(y - 5);
  drawBlueRule(y + 5);
  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(useMatrix ? 8.5 : 9.5);
  doc.setTextColor(71, 85, 105);
  const summaryText = [
    `Total Students: ${total.students ?? rows.length}`,
    `Total Sessions: ${total.sessionDates ?? 0}`,
    `Present: ${total.present ?? 0}`,
    `Absent: ${total.absent ?? 0}`,
    `Late: ${total.late ?? 0}`,
    `Excused: ${total.excused ?? 0}`,
    `Attendance Rate: ${total.attendanceRate ?? 0}%`,
  ].join('    ');
  doc.text(summaryText, pageWidth / 2, y, { align: 'center' });
  y += useMatrix ? 16 : 20;

  if (useMatrix) {
    // Legend (green/red/orange/blue)
    const legendX = margin;
    LEGEND.forEach(({ status, label }, idx) => {
      const c = STATUS_COLORS[status];
      const boxW = 10;
      const gap = 4;
      const x0 = legendX + idx * 96;
      doc.setFillColor(...c.fill);
      doc.rect(x0, y - 8, boxW, boxW, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...c.text);
      doc.text(label, x0 + boxW + gap, y - 1);
    });
    // Rate legend (yellow)
    doc.setFillColor(...RATE_COLOR.fill);
    doc.rect(legendX + 4 * 96, y - 8, 10, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...RATE_COLOR.text);
    doc.text('Rate', legendX + 4 * 96 + 14, y - 1);
    y += 14;
  }

  if (useMatrix) {
    const { dates, statusByDate } = buildMatrix(rows, records);
    drawBlueRule(y - 8);
    autoTable(doc, {
      startY: y,
      head: [['Student No', 'Student', ...dates.map((d) => shortDate(d)), 'Rate']],
      body: rows.map((r) => [
        r.studentNumber ?? '',
        r.studentName ?? '',
        ...dates.map((d) => statusByDate(r.studentId)[d] || ''),
        `${r.attendanceRate ?? 0}%`,
      ]),
      theme: 'grid',
      tableLineColor: [59, 130, 246],
      tableLineWidth: 1.2,
      headStyles: { fillColor: [99, 102, 241], fontSize: 7.5, halign: 'center', valign: 'middle' },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
      styles: { cellPadding: 2, valign: 'middle', fontSize: 7.5, lineColor: [148, 163, 184], lineWidth: 0.4 },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 64 },
        1: { halign: 'left', cellWidth: 130 },
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        const { cell, column } = data;
        const totalCols = data.table.body[0]?.raw?.length ?? 0;
        if (column.index === totalCols - 1) {
          // Rate column -> yellow
          cell.styles.fillColor = RATE_COLOR.fill;
          cell.styles.textColor = RATE_COLOR.text;
          cell.styles.fontStyle = 'bold';
          cell.styles.halign = 'center';
        } else if (column.index >= 2) {
          const status = String(cell.raw || '');
          const c = STATUS_COLORS[status];
          if (c) {
            cell.styles.fillColor = c.fill;
            cell.styles.textColor = c.text;
            cell.styles.fontStyle = 'bold';
            cell.styles.halign = 'center';
          } else {
            cell.styles.fillColor = [248, 250, 252];
            cell.styles.textColor = [148, 163, 184];
            cell.styles.halign = 'center';
          }
        }
      },
    });
    drawBlueRule(doc.lastAutoTable.finalY + 10);
  } else if (rows.length) {
    drawBlueRule(y - 8);
    autoTable(doc, {
      startY: y,
      head: [['Student No', 'Student', 'Present', 'Absent', 'Late', 'Excused', 'Rate']],
      body: rows.map((r) => [
        r.studentNumber ?? '',
        r.studentName ?? '',
        String(r.present ?? 0),
        String(r.absent ?? 0),
        String(r.late ?? 0),
        String(r.excused ?? 0),
        `${r.attendanceRate ?? 0}%`,
      ]),
      theme: 'grid',
      tableLineColor: [59, 130, 246],
      tableLineWidth: 1.2,
      headStyles: { fillColor: [99, 102, 241], fontSize: 9, halign: 'left' },
      bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
      styles: { lineColor: [148, 163, 184], lineWidth: 0.4 },
      alternateRowStyles: { fillColor: [243, 244, 246] },
      margin: { left: margin, right: margin },
    });
    drawBlueRule(doc.lastAutoTable.finalY + 10);
  }

  // Signature block (teacher's signature, bottom right)
  if (signature) {
    try {
      const fmt = signature.startsWith('data:image/jpeg') || signature.startsWith('data:image/jpg') ? 'JPEG' : 'PNG';
      const oW = signatureWidth || 1;
      const oH = signatureHeight || 1;
      const maxW = 130;
      const maxH = 38;
      const scale = Math.min(1, maxW / oW, maxH / oH);
      const w = Math.round(oW * scale);
      const h = Math.round(oH * scale);
      const x = pageWidth - margin - w;
      const lineY = pageHeight - 96;
      const imgY = lineY - h + 2;
      doc.addImage(signature, fmt, x, imgY, w, h, undefined, 'FAST');
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.8);
      doc.line(x, lineY, x + w, lineY);
      const name = meta.instructor || '';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(name, x + w / 2, lineY + 13, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Signature over Instructor Name', x + w / 2, lineY + 24, { align: 'center' });
    } catch (err) {
      console.error('Signature attach failed:', err?.message || err);
    }
  }

  const text = doc.splitTextToSize('Generated by ClassTrack Attendance Management System', pageWidth - margin * 2);
  const finalY = doc.internal.pageSize.getHeight() - 32;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(text, margin, finalY);

  await saveBlob(doc.output('blob'), fileName);
  return fileName;
}

/**
 * Generate a Student Masterlist PDF, grouped by class section.
 * Each section label is printed centered with blue rules above and below,
 * followed by a table with Student No. and Student Name.
 */
export async function exportStudentMasterlistPDF({
  title = 'STUDENT MASTERLIST',
  meta = {},
  sections = [],
  fileName = 'Student_Masterlist.pdf',
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = 44;

  const drawBlueRule = (yy) => {
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(1.4);
    doc.line(margin, yy, pageWidth - margin, yy);
  };

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(title, margin, y);
  y += 6;
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  // Section & School Year (centered, the only info shown)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  const infoLine = `SECTION: ${meta.section || 'All Sections'}${meta.schoolYear ? `   •   SCHOOL YEAR: ${meta.schoolYear}` : ''}`;
  doc.text(infoLine, pageWidth / 2, y, { align: 'center' });
  y += 18;

  for (const section of sections || []) {
    const rows = section.students || [];
    if (pageHeight - y < 80) {
      doc.addPage();
      y = 44;
    }
    // Centered section header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(section.label || 'SECTION', pageWidth / 2, y, { align: 'center' });
    y += 12;

    autoTable(doc, {
      startY: y,
      head: [['#', 'Student No', 'Student Name']],
      body: rows.map((s, i) => [String(i + 1), s.studentNumber ?? '', s.studentName ?? '']),
      theme: 'grid',
      tableLineColor: [59, 130, 246],
      tableLineWidth: 1.2,
      headStyles: { fillColor: [99, 102, 241], fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
      styles: { lineColor: [148, 163, 184], lineWidth: 0.4, cellPadding: 4 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 34 },
        1: { cellWidth: 110 },
      },
      margin: { left: margin, right: margin },
    });
    const tableEnd = doc.lastAutoTable.finalY;
    drawBlueRule(tableEnd + 10);
    y = tableEnd + 24;
  }

  const text = doc.splitTextToSize('Generated by ClassTrack Attendance Management System', pageWidth - margin * 2);
  const finalY = doc.internal.pageSize.getHeight() - 32;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(text, margin, finalY);

  await saveBlob(doc.output('blob'), fileName);
  return fileName;
}

/**
 * Build a print window containing the attendance report for the browser print dialog.
 * Same colorful date-grid layout is used when `records` is provided.
 */
export function openPrintView({ title, meta = {}, rows = [], total = {}, records = [], signature = '', signatureWidth = 0, signatureHeight = 0 }) {
  const styles = `
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 24px; font-size: 12px; }
    .report-title { text-align: center; font-size: 20px; font-weight: 700; margin: 0 0 4px; color: #1e1b4b; }
    .report-sub { text-align: center; font-size: 12px; color: #475569; margin-bottom: 16px; }
    .meta { display: flex; flex-wrap: wrap; gap: 6px 24px; margin-bottom: 14px; }
    .meta div { flex: 1 1 40%; color: #475569; }
    .meta strong { color: #0f172a; font-weight: 600; }
    .section-title { font-size: 14px; font-weight: 700; margin: 14px 0 6px; color: #312e81; }
    .summary { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .summary span { background: #eef2ff; border: 1px solid #e0e7ff; border-radius: 6px; padding: 4px 10px; font-size: 11px; }
    .legend { display: flex; flex-wrap: wrap; gap: 10px 18px; margin: 8px 0 10px; }
    .legend-item { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; }
    .swatch { display: inline-block; width: 12px; height: 12px; border-radius: 3px; border: 1px solid rgba(0,0,0,0.15); }
    .swatch.present { background: #4ade80; }
    .swatch.absent { background: #f87171; }
    .swatch.late { background: #fb923c; }
    .swatch.excused { background: #60a5fa; }
    .swatch.rate { background: #fde047; }
    .matrix-wrap { overflow-x: auto; margin-bottom: 16px; }
    table.matrix { width: 100%; border-collapse: collapse; font-size: 10px; }
    table.matrix th, table.matrix td { border: 1px solid #cbd5e1; padding: 4px 5px; text-align: center; white-space: nowrap; }
    table.matrix th { background: #eef2ff; font-weight: 700; color: #1e1b4b; position: sticky; }
    table.matrix td.student { text-align: left; white-space: nowrap; }
    td.present { background: #4ade80; color: #064e3b; font-weight: 700; }
    td.absent { background: #f87171; color: #7f1d1d; font-weight: 700; }
    td.late { background: #fb923c; color: #7c2d12; font-weight: 700; }
    td.excused { background: #60a5fa; color: #1e3a8a; font-weight: 700; }
    td.rate { background: #fde047; color: #713f12; font-weight: 700; }
    td.empty { background: #f8fafc; color: #94a3b8; }
    table.summary { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    table.summary th, table.summary td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 11px; }
    table.summary th { background: #eef2ff; font-weight: 700; color: #1e1b4b; }
    table.summary tr:nth-child(even) td { background: #f8fafc; }
    .footer { margin-top: 24px; text-align: center; color: #94a3b8; font-size: 10px; }
    .sig-wrap { text-align: right; margin: 28px 0 8px; }
    .sig-wrap img { height: 38px; background: #fff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px; }
    .sig-line { border-bottom: 1px solid #0f172a; width: 220px; margin: 2px 0 0 auto; }
    .sig-name { font-weight: 700; color: #0f172a; font-size: 12px; margin-top: 4px; }
    .sig-label { color: #475569; font-size: 10px; }
    @media print { body { margin: 12px; } }
  `;

  const metaHtml = Object.entries({
    Subject: meta.subjectName,
    Section: meta.section,
    Instructor: meta.instructor,
    'School Year': meta.schoolYear,
    Semester: meta.semester,
    Room: meta.room,
    'Date Range': meta.dateRange,
  })
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `<div><strong>${k}:</strong> ${escapeHtml(v)}</div>`)
    .join('');

  const summaryHtml = [
    `Total Students: ${total.students ?? rows.length}`,
    `Total Sessions: ${total.sessionDates ?? 0}`,
    `Present: ${total.present ?? 0}`,
    `Absent: ${total.absent ?? 0}`,
    `Late: ${total.late ?? 0}`,
    `Excused: ${total.excused ?? 0}`,
    `Attendance Rate: ${total.attendanceRate ?? 0}%`,
  ]
    .map((s) => `<span>${s}</span>`)
    .join('');

  const legendHtml = `
    <div class="legend">
      <span class="legend-item"><span class="swatch present"></span> Present</span>
      <span class="legend-item"><span class="swatch absent"></span> Absent</span>
      <span class="legend-item"><span class="swatch late"></span> Late</span>
      <span class="legend-item"><span class="swatch excused"></span> Excused</span>
      <span class="legend-item"><span class="swatch rate"></span> Rate</span>
    </div>`;

  const useMatrix = Array.isArray(records) && (records.length > 0 || (rows && rows.length > 0));
  const { dates, statusByDate } = useMatrix ? buildMatrix(rows, records) : { dates: [], statusByDate: () => ({}) };

  let tableHtml = '';
  if (useMatrix) {
    const headCells = ['Student No', 'Student', ...dates.map((d) => escapeHtml(shortDate(d))), 'Rate']
      .map((h) => `<th>${h}</th>`)
      .join('');
    let rowsHtml = '';
    for (const r of rows) {
      const cells = dates
        .map((d) => {
          const s = statusByDate(r.studentId)[d];
          return s ? `<td class="${s}"></td>` : `<td class="empty">&nbsp;</td>`;
        })
        .join('');
      rowsHtml += `<tr>
        <td class="student">${escapeHtml(r.studentNumber ?? '—')}</td>
        <td class="student">${escapeHtml(r.studentName ?? '—')}</td>
        ${cells}
        <td class="rate">${r.attendanceRate ?? 0}%</td>
      </tr>`;
    }
    tableHtml = `<div class="matrix-wrap"><table class="matrix">
      <thead><tr>${headCells}</tr></thead>
      <tbody>${rowsHtml || `<tr><td colspan="${dates.length + 3}">No records found.</td></tr>`}</tbody>
    </table></div>`;
  } else {
    let rowsHtml = '';
    for (const r of rows) {
      rowsHtml += `<tr>
        <td>${escapeHtml(r.studentNumber ?? '—')}</td>
        <td>${escapeHtml(r.studentName ?? '—')}</td>
        <td>${r.present ?? 0}</td><td>${r.absent ?? 0}</td>
        <td>${r.late ?? 0}</td><td>${r.excused ?? 0}</td>
        <td>${r.attendanceRate ?? 0}%</td>
      </tr>`;
    }
    tableHtml = `<table class="summary">
      <thead><tr><th>Student No</th><th>Student</th><th>Present</th><th>Absent</th><th>Late</th><th>Excused</th><th>Rate</th></tr></thead>
      <tbody>${rowsHtml || '<tr><td colspan="7">No records found.</td></tr>'}</tbody>
    </table>`;
  }

  const win = window.open('', '_blank', 'width=1024,height=760');
  if (!win) {
    alert('Please allow pop-ups to print the report.');
    return;
  }
  win.document.write(`<!DOCTYPE html>
  <html>
  <head><meta charset="utf-8" /><title>${escapeHtml(title)}</title><style>${styles}</style></head>
  <body>
    <h1 class="report-title">${escapeHtml(title)}</h1>
    <p class="report-sub">Generated on ${formatDate(new Date())}</p>
    <div class="meta">${metaHtml}</div>
    <div class="section-title">Attendance Summary</div>
    <div class="summary">${summaryHtml}</div>
    <div class="section-title">Student Attendance Report</div>
    ${legendHtml}
    ${tableHtml}
    ${signature ? `
    <div class="sig-wrap">
      <img src="${signature}" alt="Signature" />
      <div class="sig-line"></div>
      <div class="sig-name">${escapeHtml(meta.instructor || '')}</div>
      <div class="sig-label">Signature over Instructor Name</div>
    </div>` : ''}
    <p class="footer">Generated by ClassTrack Attendance Management System</p>
  </body>
  </html>`);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 350);
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}