import { useEffect, useMemo, useState } from 'react';
import { subscribeClasses } from '../services/classService';
import { subscribeAllStudents } from '../services/studentService';
import { subscribeAllRecords } from '../services/attendanceService';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ReportFilters from '../components/ReportFilters';
import ExportButtons from '../components/ExportButtons';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { summarizeByStudent, buildClassReport, sortRowsByAttendance } from '../utils/attendanceCalculator';
import { formatDateTime, statusText, formatDate } from '../utils/format';
import { exportAttendancePDF, openPrintView } from '../utils/pdfExport';
import { exportAttendanceExcel } from '../utils/excelExport';
import { exportAttendanceCSV } from '../utils/csvExport';
import { isNative } from '../utils/fileSave';

export default function Reports() {
  const { push } = useToast();
  const { profile } = useAuth();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ classId: '', studentId: '', from: '', to: '', status: '' });

  useEffect(() => {
    const unsubs = [];
    unsubs.push(subscribeClasses((data) => {
      setClasses(data);
      if (data.length === 0) setLoading(false);
    }));
    unsubs.push(subscribeAllStudents((data) => setStudents(data)));
    unsubs.push(
      subscribeAllRecords((data) => {
        setRecords(data);
        setLoading(false);
      })
    );
    return () => unsubs.forEach((u) => u?.());
  }, []);

  const classById = useMemo(() => {
    const m = {};
    for (const c of classes) m[c.id] = c;
    return m;
  }, [classes]);

  const studentById = useMemo(() => {
    const m = {};
    for (const s of students) m[s.id] = s;
    return m;
  }, [students]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filters.classId && r.classId !== filters.classId) return false;
      if (filters.studentId && r.studentId !== filters.studentId) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (filters.from && r.date < filters.from) return false;
      if (filters.to && r.date > filters.to) return false;
      return true;
    });
  }, [records, filters]);

  const report = useMemo(() => {
    if (filters.studentId) {
      const st = studentById[filters.studentId];
      if (!st) return { showStudent: true, rows: [], total: {}, student: null };
      const decorated = filteredRecords
        .filter((r) => r.studentId === st.id)
        .map((r) => ({
          ...r,
          studentName: st.fullName,
          studentNumber: st.studentNumber,
        }));
      const map = summarizeByStudent(decorated);
      const sum = map[st.id] || { present: 0, absent: 0, late: 0, excused: 0, sessions: 0 };
      const row = {
        studentId: st.id,
        studentNumber: st.studentNumber,
        studentName: st.fullName,
        present: sum.present,
        absent: sum.absent,
        late: sum.late,
        excused: sum.excused,
        sessions: sum.sessions,
        attendanceRate: sum.attendanceRate ?? 0,
      };
      const total = {
        students: 1,
        sessionDates: new Set(filteredRecords.map((r) => r.date)).size,
        present: sum.present,
        absent: sum.absent,
        late: sum.late,
        excused: sum.excused,
        attendanceRate: sum.attendanceRate ?? 0,
      };
      return { showStudent: true, rows: [row], total, student: st };
    }

    let scopeStudents;
    if (filters.classId) {
      scopeStudents = students.filter((s) => s.classId === filters.classId);
    } else {
      scopeStudents = students.filter((s) => classById[s.classId]);
    }

    const decoratedRecords = filteredRecords
      .filter((r) => scopeStudents.some((s) => s.id === r.studentId))
      .map((r) => {
        const st = studentById[r.studentId];
        return {
          ...r,
          studentName: st?.fullName || '',
          studentNumber: st?.studentNumber || '',
        };
      });

    const byStudent = summarizeByStudent(decoratedRecords);
    const base = buildClassReport(scopeStudents, byStudent, decoratedRecords);
    return { showStudent: false, rows: sortRowsByAttendance(base.rows), total: base.total };
  }, [filteredRecords, students, filters, studentById, classById]);

  const reportMeta = useMemo(() => {
    const cls = filters.classId ? classById[filters.classId] : null;
    const dateRange =
      filters.from || filters.to
        ? `${filters.from || '…'} to ${filters.to || '…'}`
        : 'All dates';
    return {
      subjectName: cls?.subjectName || 'All Subjects',
      section: cls?.section || 'All Sections',
      instructor: cls?.instructor || '',
      schoolYear: cls?.schoolYear || '',
      semester: cls?.semester || '',
      room: cls?.room || '',
      dateRange,
    };
  }, [filters.classId, filters.from, filters.to, classById]);

  const fileNameBase = useMemo(() => {
    const safe = (s) => String(s || '').replace(/[^\w-]+/g, '_');
    const subj = safe(reportMeta.subjectName);
    const year = safe(reportMeta.schoolYear) || new Date().getFullYear();
    return `Attendance_Report_${subj}_${year}`;
  }, [reportMeta]);

  const handleExport = async (type) => {
    const rows = report.rows;
    if (!rows.length) {
      push('No data to export for the current filters.', 'warning');
      return;
    }
    try {
      const displayRows = rows.map((r) => ({
        studentId: r.studentId,
        studentNumber: r.studentNumber || '',
        studentName: r.studentName || '',
        present: r.present,
        absent: r.absent,
        late: r.late,
        excused: r.excused,
        attendanceRate: r.attendanceRate ?? 0,
      }));

      const recordRows = filteredRecords.map((r) => {
        const st = studentById[r.studentId];
        const cls = classById[r.classId];
        return {
          studentNumber: st?.studentNumber || r.studentNumber || '',
          studentName: st?.fullName || r.studentName || r.studentId,
          className: cls ? `${cls.subjectName}${cls.section ? ' · ' + cls.section : ''}` : '—',
          subject: cls?.subjectName || '',
          date: r.date || '',
          status: statusText(r.status),
          timeRecorded: r.timeRecorded ? formatDateTime(r.timeRecorded) : '',
        };
      });

      const matrixRecords = filteredRecords.map((r) => ({
        studentId: r.studentId,
        date: r.date,
        status: r.status,
      }));

      if (type === 'pdf') {
        const meta = {
          ...reportMeta,
          dateRange: reportMeta.dateRange,
        };
        const totals = {
          students: report.total.students ?? rows.length,
          sessionDates: report.total.sessionDates ?? new Set(filteredRecords.map((r) => r.date)).size,
          present: rows.reduce((a, r) => a + r.present, 0),
          absent: rows.reduce((a, r) => a + r.absent, 0),
          late: rows.reduce((a, r) => a + r.late, 0),
          excused: rows.reduce((a, r) => a + r.excused, 0),
          attendanceRate: report.total.attendanceRate ?? 0,
        };
        await exportAttendancePDF({
          title: report.showStudent ? 'STUDENT ATTENDANCE REPORT' : 'CLASS ATTENDANCE REPORT',
          meta,
          rows: displayRows,
          total: totals,
          records: matrixRecords,
          signature: profile?.signature || '',
          signatureWidth: profile?.signatureWidth || 0,
          signatureHeight: profile?.signatureHeight || 0,
          fileName: `${fileNameBase}.pdf`,
        });
        push(isNative() ? 'PDF saved to Download/ClassTrack.' : 'PDF exported.', 'success');
      } else if (type === 'excel') {
        const summaryRows = displayRows.map((r) => ({
          ...r,
          attendanceRate: Number(r.attendanceRate.toFixed(2)),
        }));
        await exportAttendanceExcel({
          records: recordRows,
          summaryRows,
          fileName: `${fileNameBase}.xlsx`,
        });
        push('Excel exported.', 'success');
      } else if (type === 'csv') {
        await exportAttendanceCSV(recordRows, `Attendance_Records.csv`);
        push(isNative() ? 'CSV saved to Download/ClassTrack.' : 'CSV exported.', 'success');
      } else if (type === 'print') {
        if (isNative()) {
          push('Print is not available in the app. Use "Export PDF" instead.', 'warning');
          return;
        }
        const totals = {
          students: report.total.students ?? rows.length,
          sessionDates: report.total.sessionDates ?? new Set(filteredRecords.map((r) => r.date)).size,
          present: rows.reduce((a, r) => a + r.present, 0),
          absent: rows.reduce((a, r) => a + r.absent, 0),
          late: rows.reduce((a, r) => a + r.late, 0),
          excused: rows.reduce((a, r) => a + r.excused, 0),
          attendanceRate: report.total.attendanceRate ?? 0,
        };
        openPrintView({
          title: report.showStudent ? 'STUDENT ATTENDANCE REPORT' : 'CLASS ATTENDANCE REPORT',
          meta: reportMeta,
          rows: displayRows,
          total: totals,
          records: matrixRecords,
          signature: profile?.signature || '',
          signatureWidth: profile?.signatureWidth || 0,
          signatureHeight: profile?.signatureHeight || 0,
        });
      }
    } catch (err) {
      console.error(err);
      push(err.message || 'Export failed.', 'error');
    }
  };

  if (loading) return <LoadingSpinner label="Loading report data..." />;

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Reports</h2>
          <p>Generate attendance summaries and export them.</p>
        </div>
        <ExportButtons onExport={handleExport} />
      </div>

      <ReportFilters classes={classes} filters={filters} onChange={setFilters}>
        <label className="field">
          <span>Student</span>
          <select value={filters.studentId} onChange={(e) => setFilters((f) => ({ ...f, studentId: e.target.value }))}>
            <option value="">All Students</option>
            {(filters.classId
              ? students.filter((s) => s.classId === filters.classId)
              : students
            )
              .sort((a, b) => a.fullName?.localeCompare(b.fullName || ''))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} {s.studentNumber ? `(${s.studentNumber})` : ''}
                </option>
              ))}
          </select>
        </label>
      </ReportFilters>

      {report.rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="📊"
            title="No report data"
            message="Adjust your filters, or take attendance first to generate a report."
          />
        </div>
      ) : (
        <div className="card card-pad">
          <div className="report-preview">
            <div className="report-heading">
              <h2>{report.showStudent ? 'STUDENT ATTENDANCE REPORT' : 'CLASS ATTENDANCE REPORT'}</h2>
              <p>Generated on {formatDate(new Date())}</p>
            </div>

            <div className="meta-grid">
              <div>
                <strong>Subject:</strong> {reportMeta.subjectName}
              </div>
              <div>
                <strong>Section:</strong> {reportMeta.section}
              </div>
              {reportMeta.instructor && (
                <div>
                  <strong>Instructor:</strong> {reportMeta.instructor}
                </div>
              )}
              <div>
                <strong>School Year:</strong> {reportMeta.schoolYear}
              </div>
              <div>
                <strong>Semester:</strong> {reportMeta.semester}
              </div>
              <div>
                <strong>Date Range:</strong> {reportMeta.dateRange}
              </div>
            </div>

            <div className="summary-strip" style={{ marginTop: 8 }}>
              <div className="summary-box violet">
                <span>Total Students</span>
                <strong>{report.total.students ?? report.rows.length}</strong>
              </div>
              <div className="summary-box">
                <span>Total Sessions</span>
                <strong>{report.total.sessionDates ?? 0}</strong>
              </div>
              <div className="summary-box green">
                <span>Present</span>
                <strong>{report.total.present ?? 0}</strong>
              </div>
              <div className="summary-box red">
                <span>Absent</span>
                <strong>{report.total.absent ?? 0}</strong>
              </div>
              <div className="summary-box amber">
                <span>Late</span>
                <strong>{report.total.late ?? 0}</strong>
              </div>
              <div className="summary-box sky">
                <span>Excused</span>
                <strong>{report.total.excused ?? 0}</strong>
              </div>
              <div className="summary-box">
                <span>Attendance Rate</span>
                <strong>{report.total.attendanceRate ?? 0}%</strong>
              </div>
            </div>

            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student No</th>
                    <th>Student</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Late</th>
                    <th>Excused</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r) => (
                    <tr key={r.studentId || r.studentNumber}>
                      <td className="mono">{r.studentNumber || '—'}</td>
                      <td>{r.studentName}</td>
                      <td>{r.present}</td>
                      <td>{r.absent}</td>
                      <td>{r.late}</td>
                      <td>{r.excused}</td>
                      <td>{r.attendanceRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}