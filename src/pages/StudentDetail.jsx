import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { fetchStudent } from '../services/studentService';
import { fetchClass } from '../services/classService';
import { getAttendanceForStudent } from '../services/attendanceService';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { formatDateTime, statusText } from '../utils/format';
import { calcRate } from '../utils/attendanceCalculator';

export default function StudentDetail() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [cls, setCls] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchStudent(studentId).then(async (st) => {
      if (!mounted) return;
      if (!st) {
        setStudent(null);
        setLoading(false);
        return;
      }
      setStudent(st);
      const [c, recs] = await Promise.all([fetchClass(st.classId), getAttendanceForStudent(studentId)]);
      if (!mounted) return;
      setCls(c);
      setRecords(recs);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [studentId]);

  const summary = useMemo(() => {
    const s = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const r of records) {
      s[r.status] = (s[r.status] || 0) + 1;
    }
    return {
      ...s,
      total: records.length,
      rate: calcRate(s.present, records.length),
    };
  }, [records]);

  if (loading) return <LoadingSpinner label="Loading student..." />;

  if (!student) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>Student not found</h3>
          <p>The student may have been deleted.</p>
          <div className="empty-action">
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/students')}>
              Back to Students
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <Link to={`/students/${cls?.id || ''}`} className="muted">
            ← Back to Students
          </Link>
          <h2 className="mt-1">{student.fullName}</h2>
          <p>
            {student.studentNumber ? `${student.studentNumber} · ` : ''}
            {cls?.subjectName}
            {cls?.section ? ` · ${cls.section}` : ''}
          </p>
        </div>
        {cls && (
          <Link className="btn btn-ghost" to={`/attendance?class=${cls.id}`}>
            Take Attendance
          </Link>
        )}
      </div>

      <div className="card card-pad mb-3">
        <dl className="detail-grid">
          <div className="detail-item">
            <dt>Student Number</dt>
            <dd className="mono">{student.studentNumber || '—'}</dd>
          </div>
          <div className="detail-item">
            <dt>Email</dt>
            <dd>{student.email || '—'}</dd>
          </div>
          <div className="detail-item">
            <dt>Class</dt>
            <dd>
              {cls ? <Link to={`/classes/${cls.id}`}>{cls.subjectName}</Link> : '—'}
            </dd>
          </div>
          <div className="detail-item">
            <dt>Section</dt>
            <dd>{cls?.section || '—'}</dd>
          </div>
          <div className="detail-item">
            <dt>Status</dt>
            <dd>
              <span className={`status-pill ${student.status === 'active' ? 'present' : 'default'}`}>
                {student.status || 'active'}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="card card-pad">
        <h3 style={{ marginBottom: 6 }}>Attendance Summary</h3>
        <div className="summary-strip">
          <div className="summary-box violet">
            <span>Total Sessions</span>
            <strong>{summary.total}</strong>
          </div>
          <div className="summary-box green">
            <span>Present</span>
            <strong>{summary.present}</strong>
          </div>
          <div className="summary-box red">
            <span>Absent</span>
            <strong>{summary.absent}</strong>
          </div>
          <div className="summary-box amber">
            <span>Late</span>
            <strong>{summary.late}</strong>
          </div>
          <div className="summary-box sky">
            <span>Excused</span>
            <strong>{summary.excused}</strong>
          </div>
          <div className="summary-box">
            <span>Attendance Rate</span>
            <strong>{summary.rate}%</strong>
          </div>
        </div>
      </div>

      <div className="section-block">
        <h3>Attendance History</h3>
        {records.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="🕘"
              title="No attendance recorded"
              message="This student has no attendance records yet."
            />
          </div>
        ) : (
          <div className="card table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Time Recorded</th>
                </tr>
              </thead>
              <tbody>
                {[...records]
                  .sort((a, b) => String(b.date).localeCompare(String(a.date)))
                  .map((r) => (
                    <tr key={r.id}>
                      <td className="nowrap">{r.date}</td>
                      <td>
                        <span className={`status-pill ${r.status}`}>{statusText(r.status)}</span>
                      </td>
                      <td className="nowrap muted">
                        {r.timeRecorded ? formatDateTime(r.timeRecorded) : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}