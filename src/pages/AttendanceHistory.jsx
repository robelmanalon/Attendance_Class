import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { subscribeClasses } from '../services/classService';
import { subscribeAllStudents } from '../services/studentService';
import { subscribeAllRecords } from '../services/attendanceService';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { formatDateTime, statusText } from '../utils/format';
import { exportAttendanceCSV } from '../utils/csvExport';

export default function AttendanceHistory() {
  const [searchParams] = useSearchParams();
  const { push } = useToast();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterClass, setFilterClass] = useState(searchParams.get('class') || '');
  const [filterStudent, setFilterStudent] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const unsubs = [];
    unsubs.push(subscribeClasses((data) => setClasses(data)));
    unsubs.push(
      subscribeAllStudents((data) => {
        setStudents(data);
        setLoading(false);
      })
    );
    unsubs.push(subscribeAllRecords((data) => setRecords(data)));
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

  const filtered = useMemo(() => {
    return records
      .map((r) => {
        const st = studentById[r.studentId];
        const cls = classById[r.classId];
        return {
          ...r,
          studentName: st?.fullName || r.studentName || r.studentId,
          studentNumber: st?.studentNumber || r.studentNumber || '',
          subject: cls?.subjectName || '',
          className: cls ? `${cls.subjectName}${cls.section ? ' · ' + cls.section : ''}` : '—',
        };
      })
      .filter((r) => {
        if (filterClass && r.classId !== filterClass) return false;
        if (filterStudent && r.studentId !== filterStudent) return false;
        if (filterStatus && r.status !== filterStatus) return false;
        if (dateFrom && r.date < dateFrom) return false;
        if (dateTo && r.date > dateTo) return false;
        return true;
      })
      .sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  }, [records, studentById, classById, filterClass, filterStudent, filterStatus, dateFrom, dateTo]);

  const exportCSV = () => {
    if (!filtered.length) {
      push('No records to export.', 'warning');
      return;
    }
    exportAttendanceCSV(
      filtered.map((r) => ({
        studentNumber: r.studentNumber,
        studentName: r.studentName,
        className: r.className,
        subject: r.subject,
        date: r.date,
        status: statusText(r.status),
        timeRecorded: r.recordTime ? formatDateTime(r.recordTime) : '',
      })),
      'Attendance_Records.csv'
    );
    push('CSV exported.', 'success');
  };

  if (loading) return <LoadingSpinner label="Loading attendance history..." />;

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Attendance History</h2>
          <p>Browse and filter all recorded attendance.</p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-info" onClick={exportCSV}>
            📘 Export CSV
          </button>
        </div>
      </div>

      <div className="filter-bar card">
        <div className="filter-grid">
          <label className="field">
            <span>Class</span>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.subjectName} · {c.section || ''}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Student</span>
            <select value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)}>
              <option value="">All Students</option>
              {(filterClass
                ? students.filter((s) => s.classId === filterClass)
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
          <label className="field">
            <span>Status</span>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="excused">Excused</option>
            </select>
          </label>
          <label className="field">
            <span>From</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label className="field">
            <span>To</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🕘"
            title="No attendance records"
            message="Adjust your filters or take attendance first."
          />
        </div>
      ) : (
        <div className="card table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Student Number</th>
                <th>Student Name</th>
                <th>Date</th>
                <th>Class</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Time Recorded</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.studentNumber || '—'}</td>
                  <td>
                    <Link to={`/students/detail/${r.studentId}`}>{r.studentName}</Link>
                  </td>
                  <td className="nowrap">{r.date}</td>
                  <td>{r.className}</td>
                  <td>{r.subject || '—'}</td>
                  <td>
                    <span className={`status-pill ${r.status}`}>{statusText(r.status)}</span>
                  </td>
                  <td className="nowrap muted">{r.recordTime ? formatDateTime(r.recordTime) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}