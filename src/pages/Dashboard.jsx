import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardCard from '../components/DashboardCard';
import ClassCard from '../components/ClassCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { subscribeClasses } from '../services/classService';
import { subscribeAllStudents } from '../services/studentService';
import { subscribeAllRecords } from '../services/attendanceService';
import { formatDateTime, todayISO, statusText } from '../utils/format';

function initialsOf(user) {
  return (user?.displayName || user?.email || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export default function Dashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const today = todayISO();

  const todayRecords = useMemo(() => records.filter((r) => r.date === today), [records, today]);
  const studentsByClass = useMemo(() => {
    const map = {};
    for (const s of students) {
      map[s.classId] = (map[s.classId] || 0) + 1;
    }
    return map;
  }, [students]);

  const todayPresent = todayRecords.filter((r) => r.status === 'present').length;
  const todayAbsent = todayRecords.filter((r) => r.status === 'absent').length;
  const todayLate = todayRecords.filter((r) => r.status === 'late').length;

  const recent = useMemo(
    () =>
      [...records]
        .sort((a, b) => {
          const at = a.recordTime ? a.recordTime.getTime?.() || 0 : 0;
          const bt = b.recordTime ? b.recordTime.getTime?.() || 0 : 0;
          return bt - at;
        })
        .slice(0, 8),
    [records]
  );

  const classById = useMemo(() => {
    const map = {};
    for (const c of classes) map[c.id] = c;
    return map;
  }, [classes]);

  if (loading) return <LoadingSpinner label="Loading your dashboard..." />;

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Hello, {user?.displayName || 'Teacher'} 👋</h2>
          <p>Here is the overview of your classes and attendance today.</p>
        </div>
      </div>

      <div className="dash-cards">
        <DashboardCard label="Total Classes" value={classes.length} icon="🏫" tone="indigo" />
        <DashboardCard label="Total Students" value={students.length} icon="👥" tone="violet" />
        <DashboardCard label="Today's Attendance" value={todayRecords.length} icon="✅" tone="sky" sub={today} />
        <DashboardCard label="Present" value={todayPresent} icon="✔️" tone="green" />
        <DashboardCard label="Absent" value={todayAbsent} icon="✖️" tone="red" />
        <DashboardCard label="Late" value={todayLate} icon="⏰" tone="amber" />
      </div>

      <div className="section-block">
        <h3>Recent Attendance Activity</h3>
        {recent.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="🕘"
              title="No attendance recorded yet"
              message="Once you start taking attendance, recent activity will show up here."
              action={
                <Link className="btn btn-primary btn-sm" to="/attendance">
                  Take Attendance
                </Link>
              }
            />
          </div>
        ) : (
          <div className="card table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Time Recorded</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => {
                  const cls = classById[r.classId];
                  return (
                    <tr key={r.id}>
                      <td>{r.studentName || r.studentId}</td>
                      <td>{cls?.subjectName || '—'}</td>
                      <td className="nowrap">{r.date}</td>
                      <td>
                        <span className={`status-pill ${r.status}`}>{statusText(r.status)}</span>
                      </td>
                      <td className="nowrap muted">
                        {r.recordTime ? formatDateTime(r.recordTime) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="section-block">
        <div className="flex-between mb-3">
          <h3>Your Classes</h3>
          <Link className="btn btn-primary btn-sm" to="/classes">
            Manage Classes
          </Link>
        </div>
        {classes.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="🏫"
              title="No classes yet"
              message="Create your first class to start taking attendance."
              action={
                <Link className="btn btn-primary btn-sm" to="/classes">
                  Create a Class
                </Link>
              }
            />
          </div>
        ) : (
          <div className="class-grid">
            {classes.map((cls) => (
              <ClassCard key={cls.id} cls={cls} stats={{ studentCount: studentsByClass[cls.id] || 0 }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}