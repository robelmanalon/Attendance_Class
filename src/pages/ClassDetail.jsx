import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchClass } from '../services/classService';
import { subscribeStudents } from '../services/studentService';
import { subscribeClassRecords, deleteAttendanceRecord } from '../services/attendanceService';
import ImportStudentModal from '../components/ImportStudentModal';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { summarizeByStudent } from '../utils/attendanceCalculator';

export default function ClassDetail() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const [cls, setCls] = useState(null);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchClass(classId).then((c) => {
      if (!mounted) return;
      setCls(c);
      if (c === null) setLoading(false);
    });
    const unsubStudents = subscribeStudents(classId, (data) => {
      setStudents(data);
    });
    const unsubRecords = subscribeClassRecords(classId, (data) => {
      setRecords(data);
      setLoading(false);
    });
    return () => {
      mounted = false;
      unsubStudents?.();
      unsubRecords?.();
    };
  }, [classId]);

  useEffect(() => {
    if (cls === null) navigate('/classes', { replace: true });
  }, [cls, navigate]);

  const summary = useMemo(() => {
    const stById = {};
    for (const s of students) stById[s.id] = s;
    const decorated = records.map((r) => ({
      ...r,
      studentName: stById[r.studentId]?.fullName || r.studentName || r.studentId,
      studentNumber: stById[r.studentId]?.studentNumber || r.studentNumber || '',
    }));
    return {
      byStudent: summarizeByStudent(decorated),
      dates: [...new Set((records || []).map((r) => r.date))].sort().reverse(),
    };
  }, [records, students]);

  const dateMap = useMemo(() => {
    const map = {};
    for (const r of records) {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    }
    return map;
  }, [records]);

  if (loading || cls === null) return <LoadingSpinner label="Loading class..." />;

  return (
    <div>
      <div className="page-head">
        <div>
          <Link to="/classes" className="muted">← Back to Classes</Link>
          <h2 className="mt-1">{cls.subjectName}</h2>
          <p>
            {cls.section} · {cls.schoolYear} · {cls.semester}
          </p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-primary" onClick={() => setImportOpen(true)}>
            📥 Import Student List
          </button>
          <Link className="btn btn-ghost" to={`/attendance?class=${cls.id}`}>
            Take Attendance
          </Link>
          <Link className="btn btn-ghost" to={`/students/${cls.id}`}>
            Manage Students
          </Link>
        </div>
      </div>

      <div className="card card-pad mb-3">
        <dl className="detail-grid">
          <div className="detail-item">
            <dt>Instructor</dt>
            <dd>{cls.instructor || '—'}</dd>
          </div>
          <div className="detail-item">
            <dt>Schedule</dt>
            <dd>{cls.schedule || '—'}</dd>
          </div>
          <div className="detail-item">
            <dt>Room</dt>
            <dd>{cls.room || '—'}</dd>
          </div>
          <div className="detail-item">
            <dt>School Year</dt>
            <dd>{cls.schoolYear || '—'}</dd>
          </div>
          <div className="detail-item">
            <dt>Semester</dt>
            <dd>{cls.semester || '—'}</dd>
          </div>
          <div className="detail-item">
            <dt>Students</dt>
            <dd>{students.length}</dd>
          </div>
        </dl>
      </div>

      <div className="section-block">
        <div className="flex-between mb-3">
          <h3>Students ({students.length})</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/students/${cls.id}`)}>
            View All
          </button>
        </div>
        {students.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="👥"
              title="No students yet"
              message="Import a student list to add students quickly."
              action={
                <button className="btn btn-primary btn-sm" onClick={() => setImportOpen(true)}>
                  📥 Import Student List
                </button>
              }
            />
          </div>
        ) : (
          <div className="card table-scroll">
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Student Number</th>
                  <th>Student Name</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Late</th>
                  <th>Excused</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {students.slice(0, 15).map((s) => {
                  const sum = summary.byStudent[s.id] || {};
                  return (
                    <tr key={s.id}>
                      <td className="mono">{s.studentNumber || '—'}</td>
                      <td>
                        <Link to={`/students/detail/${s.id}`}>{s.fullName}</Link>
                      </td>
                      <td>{sum.present ?? 0}</td>
                      <td>{sum.absent ?? 0}</td>
                      <td>{sum.late ?? 0}</td>
                      <td>{sum.excused ?? 0}</td>
                      <td>{sum.attendanceRate ?? 0}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="section-block">
        <h3>Attendance Sessions ({summary.dates.length})</h3>
        {summary.dates.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="🗓️"
              title="No attendance sessions yet"
              message={
                <>
                  Take attendance for this class by opening{' '}
                  <Link to={`/attendance?class=${cls.id}`}>Attendance</Link>.
                </>
              }
            />
          </div>
        ) : (
          <div className="card table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Late</th>
                  <th>Excused</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {summary.dates.map((date) => {
                  const recs = dateMap[date] || [];
                  const count = (s) => recs.filter((r) => r.status === s).length;
                  return (
                    <tr key={date}>
                      <td className="nowrap">{date}</td>
                      <td>{count('present')}</td>
                      <td>{count('absent')}</td>
                      <td>{count('late')}</td>
                      <td>{count('excused')}</td>
                      <td>
                        <div className="row-actions">
                          <Link className="btn btn-ghost btn-sm" to={`/attendance?class=${cls.id}&date=${date}`}>
                            Edit
                          </Link>
                          <button
                            className="btn btn-sm"
                            onClick={() => setDeletingRecord(date)}
                            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--danger)' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ImportStudentModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        classId={classId}
        onImported={() => push('Students imported.', 'success')}
      />

      <ConfirmModal
        open={!!deletingRecord}
        onClose={() => setDeletingRecord(null)}
        onConfirm={async () => {
          const recs = dateMap[deletingRecord] || [];
          for (const r of recs) await deleteAttendanceRecord(r.id);
          push(`Attendance for ${deletingRecord} deleted.`, 'success');
        }}
        title="Delete this attendance session?"
        message={`This will remove all attendance records for ${deletingRecord} in this class.`}
        confirmLabel="Delete Session"
      />
    </div>
  );
}