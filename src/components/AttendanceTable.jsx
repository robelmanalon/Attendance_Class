import AttendanceStatus from './AttendanceStatus';

export default function AttendanceTable({ students, statusMap, onStatusChange, loading }) {
  return (
    <div className="table-scroll">
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Student Number</th>
            <th>Student Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="4" className="empty-cell">
                Loading students...
              </td>
            </tr>
          ) : students.length === 0 ? (
            <tr>
              <td colSpan="4" className="empty-cell">
                No students found. Select a class that has students or import a list first.
              </td>
            </tr>
          ) : (
            students.map((student, idx) => (
              <tr key={student.id}>
                <td>{idx + 1}</td>
                <td className="mono">{student.studentNumber || '—'}</td>
                <td>{student.fullName}</td>
                <td>
                  <AttendanceStatus
                    value={statusMap[student.id] || 'present'}
                    onChange={(s) => onStatusChange?.(student.id, s)}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}