import * as XLSX from 'xlsx';
import { statusText } from './format';

function statusLabel(status) {
  return statusText(status);
}

/**
 * Build an Excel workbook with two sheets:
 *   Sheet 1 "Attendance Records"  — flat list of records
 *   Sheet 2 "Attendance Summary"  — per student summary
 */
export async function exportAttendanceExcel({ records, summaryRows, className, fileName = 'Attendance_Report.xlsx' }) {
  const recordsSheet = (records || []).map((r) => ({
    'Student Number': r.studentNumber ?? '',
    'Student Name': r.studentName ?? '',
    Class: r.className ?? '',
    Subject: r.subject ?? '',
    Date: r.date ?? '',
    Status: statusLabel(r.status),
    'Time Recorded': r.timeRecorded ?? '',
  }));

  const summarySheet = (summaryRows || []).map((r) => ({
    'Student Number': r.studentNumber ?? '',
    'Student Name': r.studentName ?? '',
    Present: r.present ?? 0,
    Absent: r.absent ?? 0,
    Late: r.late ?? 0,
    Excused: r.excused ?? 0,
    'Attendance Rate': `${r.attendanceRate ?? 0}%`,
  }));

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(recordsSheet.length ? recordsSheet : [{}]);
  const ws2 = XLSX.utils.json_to_sheet(summarySheet.length ? summarySheet : [{}]);
  if (recordsSheet.length === 0) ws1['!ref'] = 'A1';
  if (summarySheet.length === 0) ws2['!ref'] = 'A1';

  XLSX.utils.book_append_sheet(wb, ws1, 'Attendance Records');
  XLSX.utils.book_append_sheet(wb, ws2, 'Attendance Summary');
  XLSX.writeFile(wb, fileName);
  return fileName;
}