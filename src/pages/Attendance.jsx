import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { subscribeClasses } from '../services/classService';
import { subscribeStudents } from '../services/studentService';
import { saveAttendance, getAttendanceForDate } from '../services/attendanceService';
import AttendanceTable from '../components/AttendanceTable';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';
import { todayISO } from '../utils/format';

export default function Attendance() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const classId = searchParams.get('class') || '';
  const dateParam = searchParams.get('date');
  const [date, setDate] = useState(dateParam || todayISO());
  const [existing, setExisting] = useState({});
  const [statusMap, setStatusMap] = useState({});

  useEffect(() => {
    let mounted = true;
    const unsubs = [];
    unsubs.push(
      subscribeClasses((data) => {
        if (!mounted) return;
        setClasses(data);
        if (data.length === 0) {
          setLoading(false);
          setLoaded(true);
        }
      })
    );

    const activeClass = classId || null;
    if (activeClass) {
      unsubs.push(
        subscribeStudents(activeClass, async (data) => {
          if (!mounted) return;
          setStudents(data);
          const existingMap = await getAttendanceForDate(activeClass, date).catch(() => ({}));
          if (!mounted) return;
          setExisting(existingMap);
          const map = {};
          for (const st of data) {
            map[st.id] = existingMap[st.id]?.status || 'present';
          }
          setStatusMap(map);
          setLoading(false);
          setLoaded(true);
        })
      );
    } else {
      setStudents([]);
      setStatusMap({});
      setExisting({});
      setLoading(true);
      setLoaded(false);
    }

    return () => {
      mounted = false;
      unsubs.forEach((u) => u?.());
    };
  }, [classId, date]);

  const selectedClass = useMemo(() => classes.find((c) => c.id === classId) || null, [classes, classId]);

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const st of students) {
      const s = statusMap[st.id] || 'present';
      c[s] = (c[s] || 0) + 1;
    }
    return c;
  }, [students, statusMap]);

  const markAll = (status) => {
    if (!students.length) return;
    const map = {};
    for (const st of students) map[st.id] = status;
    setStatusMap(map);
    push(`Marked all students as ${status}.`, 'info');
  };

  const handleSave = async () => {
    if (!classId || !date) {
      push('Select a class and date first.', 'warning');
      return;
    }
    if (!students.length) {
      push('This class has no students to mark.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await saveAttendance(classId, date, statusMap, students);
      push(
        `Attendance saved (${res.created} created · ${res.updated} updated).`,
        'success'
      );
    } catch (err) {
      console.error(err);
      push(err.message || 'Failed to save attendance.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const sessionStatus = loaded && students.length > 0 ? (Object.keys(existing).length > 0 ? 'update' : 'create') : null;

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Take Attendance</h2>
          <p>
            {sessionStatus === 'create'
              ? 'This session is new — records will be created.'
              : sessionStatus === 'update'
              ? 'Attendance already exists for this date — saving will update records.'
              : 'Select a class and date to begin.'}
          </p>
        </div>
      </div>

      <div className="filter-bar card">
        <div className="filter-grid">
          <label className="field">
            <span>Class</span>
            <select value={classId} onChange={(e) => navigate(`/attendance?class=${e.target.value}`)}>
              <option value="">Select a class...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.subjectName} · {c.section || ''}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span>Subject / Session</span>
            <input defaultValue={selectedClass?.subjectName || ''} disabled placeholder="Auto from selected class" />
          </label>
          <div className="field">
            <span>&nbsp;</span>
            <Link className="btn btn-ghost" to={`/attendance-history?class=${classId || ''}`}>
              View History
            </Link>
          </div>
        </div>
      </div>

      {!classId ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <h3>Select a class</h3>
            <p>Choose a class above to take attendance for today&apos;s session.</p>
          </div>
        </div>
      ) : loading || !loaded ? (
        <LoadingSpinner label="Loading students..." />
      ) : (
        <>
          {students.length > 0 && (
            <div className="card card-pad mb-3">
              <div className="flex-between">
                <div>
                  <strong>
                    {selectedClass?.subjectName}
                    {selectedClass?.section ? ` · ${selectedClass.section}` : ''}
                  </strong>
                  <div className="muted" style={{ fontSize: 12.5 }}>
                    {date} · {students.length} students
                  </div>
                </div>
                <div className="row-actions">
                  <button className="btn btn-success btn-sm" onClick={() => markAll('present')}>
                    Mark All Present
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => markAll('absent')}>
                    Mark All Absent
                  </button>
                </div>
              </div>
              <div className="summary-strip" style={{ marginBottom: 0 }}>
                <div className="summary-box green">
                  <span>Present</span>
                  <strong>{counts.present}</strong>
                </div>
                <div className="summary-box red">
                  <span>Absent</span>
                  <strong>{counts.absent}</strong>
                </div>
                <div className="summary-box amber">
                  <span>Late</span>
                  <strong>{counts.late}</strong>
                </div>
                <div className="summary-box sky">
                  <span>Excused</span>
                  <strong>{counts.excused}</strong>
                </div>
              </div>
            </div>
          )}

          {students.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <h3>No students in this class</h3>
                <p>
                  Import a student list first so you can take attendance.
                </p>
                {selectedClass && (
                  <div className="empty-action">
                    <Link className="btn btn-primary btn-sm" to={`/classes/${selectedClass.id}`}>
                      Import Student List
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="card table-scroll mb-3">
                <AttendanceTable
                  students={students}
                  statusMap={statusMap}
                  onStatusChange={(sid, s) => setStatusMap((prev) => ({ ...prev, [sid]: s }))}
                />
              </div>
              <div className="flex-between">
                <span className="muted" style={{ fontSize: 12.5 }}>
                  {Object.keys(existing).length > 0
                    ? `Existing records for this date will be updated (${Object.keys(existing).length}).`
                    : 'No existing records for this date.'}
                </span>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving || !students.length}>
                  {saving ? 'Saving...' : Object.keys(existing).length > 0 ? 'Update Attendance' : 'Save Attendance'}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}