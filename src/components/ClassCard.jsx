import { Link } from 'react-router-dom';
import { classTitle, formatDate } from '../utils/format';

export default function ClassCard({ cls, stats, actions }) {
  const studentCount = stats?.studentCount ?? 0;

  return (
    <div className="class-card">
      <div className="class-card-head">
        <div className="class-subject-icon">{cls.subjectName?.slice(0, 2).toUpperCase() || 'CL'}</div>
        <div className="class-card-meta">
          <h3>{cls.subjectName}</h3>
          <span className="pill">{cls.section || 'No section'}</span>
        </div>
      </div>
      <div className="class-card-body">
        <dl className="class-details">
          <div>
            <dt>Instructor</dt>
            <dd>{cls.instructor || '—'}</dd>
          </div>
          <div>
            <dt>Schedule</dt>
            <dd>{cls.schedule || '—'}</dd>
          </div>
          <div>
            <dt>School Year</dt>
            <dd>{cls.schoolYear || '—'}</dd>
          </div>
          <div>
            <dt>Semester</dt>
            <dd>{cls.semester || '—'}</dd>
          </div>
          <div>
            <dt>Room</dt>
            <dd>{cls.room || '—'}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDate(cls.createdAt)}</dd>
          </div>
        </dl>
        <div className="class-card-stats">
          <span className="stat-block">
            <strong>{studentCount}</strong>
            <span>Students</span>
          </span>
        </div>
      </div>
      <div className="class-card-actions">
        <Link className="btn btn-primary btn-sm" to={`/classes/${cls.id}`}>
          View Class
        </Link>
        <Link className="btn btn-ghost btn-sm" to={`/attendance?class=${cls.id}`}>
          Take Attendance
        </Link>
        {actions}
      </div>
    </div>
  );
}