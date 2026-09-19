import { STATUSES } from '../utils/attendanceCalculator';

const LABELS = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
};

const TONES = {
  present: 'present',
  absent: 'absent',
  late: 'late',
  excused: 'excused',
};

export default function AttendanceStatus({ value, onChange, disabled }) {
  return (
    <div className="segmented">
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          className={`seg-btn tone-${TONES[s]} ${value === s ? 'selected' : ''}`}
          disabled={disabled}
          onClick={() => (disabled ? null : onChange(s))}
        >
          {LABELS[s]}
        </button>
      ))}
    </div>
  );
}