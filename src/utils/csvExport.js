function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSV(rows, columns) {
  const header = columns.map((c) => csvEscape(c.label)).join(',');
  const body = rows
    .map((row) => columns.map((c) => csvEscape(row[c.key])).join(','))
    .join('\r\n');
  return `${header}\r\n${body}`;
}

/**
 * Export attendance records to CSV.
 * @param {Array} records { studentNumber, studentName, className, subject, date, status, timeRecorded }
 */
export function exportAttendanceCSV(records, fileName = 'Attendance_Records.csv') {
  const columns = [
    { key: 'studentNumber', label: 'Student Number' },
    { key: 'studentName', label: 'Student Name' },
    { key: 'className', label: 'Class' },
    { key: 'subject', label: 'Subject' },
    { key: 'date', label: 'Date' },
    { key: 'status', label: 'Status' },
    { key: 'timeRecorded', label: 'Time Recorded' },
  ];
  const normalized = records.map((r) => ({
    studentNumber: r.studentNumber ?? '',
    studentName: r.studentName ?? '',
    className: r.className ?? '',
    subject: r.subject ?? '',
    date: r.date ?? '',
    status: r.status ?? '',
    timeRecorded: r.timeRecorded ?? '',
  }));
  const csv = toCSV(normalized, columns);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, fileName);
  return fileName;
}

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}