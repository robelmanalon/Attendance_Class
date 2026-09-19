export const STATUSES = ['present', 'absent', 'late', 'excused'];

const STATUS_ORDER = { present: 0, absent: 1, late: 2, excused: 3 };

/**
 * Compute per-student attendance summary.
 * @param {Array} records flattened attendance records
 * @returns map of studentId -> summary
 */
export function summarizeByStudent(records) {
  const map = {};
  for (const rec of records || []) {
    const sid = rec.studentId;
    if (!map[sid]) {
      map[sid] = {
        studentId: sid,
        studentName: rec.studentName || '',
        studentNumber: rec.studentNumber || '',
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        sessions: 0,
      };
    }
    const s = map[sid];
    const status = String(rec.status || 'present').toLowerCase();
    if (Object.prototype.hasOwnProperty.call(STATUS_ORDER, status)) {
      s[status] += 1;
    } else {
      s.present += 1;
    }
    s.sessions += 1;
  }
  for (const key of Object.keys(map)) {
    map[key].attendanceRate = calcRate(map[key].present, map[key].sessions);
  }
  return map;
}

export function calcRate(presentCount, totalSessions) {
  if (!totalSessions) return 0;
  return Number(((presentCount / totalSessions) * 100).toFixed(2));
}

/**
 * Compute a class-level report from per-student summaries.
 * @param {Array} students
 * @param {Object} summaryMap from summarizeByStudent
 * @param {Array} allRecords
 */
export function buildClassReport(students, summaryMap, allRecords) {
  const rows = (students || []).map((st) => {
    const sum = summaryMap[st.id] || {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      sessions: 0,
      attendanceRate: 0,
    };
    return {
      studentId: st.id,
      studentNumber: st.studentNumber,
      studentName: `${st.lastName ? st.lastName + ', ' : ''}${st.fullName}`,
      fullName: st.fullName,
      present: sum.present,
      absent: sum.absent,
      late: sum.late,
      excused: sum.excused,
      sessions: sum.sessions,
      attendanceRate: sum.attendanceRate,
    };
  });

  const total = rows.reduce(
    (acc, r) => ({
      present: acc.present + r.present,
      absent: acc.absent + r.absent,
      late: acc.late + r.late,
      excused: acc.excused + r.excused,
      sessions: acc.sessions + r.sessions,
    }),
    { present: 0, absent: 0, late: 0, excused: 0, sessions: 0 }
  );

  const uniqueDates = new Set((allRecords || []).map((r) => r.date));
  total.students = rows.length;
  total.sessionDates = uniqueDates.size;
  total.attendanceRate = calcRate(total.present, total.present + total.absent + total.late);

  return { rows, total };
}

export function sortRowsByAttendance(rows) {
  return [...rows].sort((a, b) => {
    if (!a.studentName && b.studentName) return -1;
    if (a.studentName && !b.studentName) return 1;
    return String(a.studentName || '').localeCompare(String(b.studentName || ''));
  });
}