export function formatDate(dateLike) {
  if (!dateLike) return '—';
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateLike) {
  if (!dateLike) return '—';
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function toISODate(dateLike) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(value) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function firestoreTimestampToString(timestamp) {
  if (!timestamp) return '—';
  if (timestamp && typeof timestamp.toDate === 'function') {
    return formatDateTime(timestamp.toDate());
  }
  if (timestamp && timestamp.seconds) {
    return formatDateTime(new Date(timestamp.seconds * 1000));
  }
  return formatDateTime(timestamp);
}

export function todayISO() {
  return toISODate(new Date());
}

export function classTitle(cls) {
  if (!cls) return '—';
  const parts = [cls.subjectName, cls.section].filter(Boolean);
  return parts.join(' · ') || 'Untitled Class';
}

export function statusText(status) {
  const map = {
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    excused: 'Excused',
  };
  return map[status] || status || '—';
}