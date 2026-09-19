export default function ReportFilters({ classes, filters, onChange, children }) {
  const set = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="filter-bar card">
      <div className="filter-grid">
        <label className="field">
          <span>Class</span>
          <select value={filters.classId} onChange={(e) => set('classId', e.target.value)}>
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.subjectName} · {c.section || ''}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Date From</span>
          <input type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} />
        </label>
        <label className="field">
          <span>Date To</span>
          <input type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} />
        </label>
        <label className="field">
          <span>Status</span>
          <select value={filters.status} onChange={(e) => set('status', e.target.value)}>
            <option value="">All Status</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="excused">Excused</option>
          </select>
        </label>
        {children}
      </div>
    </div>
  );
}