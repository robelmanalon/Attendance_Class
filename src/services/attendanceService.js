import { db } from '../firebase/firestore';
import { collection, query, where, onSnapshot, getDocs, getDoc, doc, addDoc, updateDoc, serverTimestamp, writeBatch, deleteDoc } from 'firebase/firestore';
import { getCurrentUser } from '../firebase/auth';
import { toISODate } from '../utils/format';

export const attendanceRef = () => collection(db, 'attendance');

function ownerQuery(extraWhere = []) {
  const user = getCurrentUser();
  return query(attendanceRef(), where('teacherId', '==', user.uid), ...extraWhere);
}

/**
 * Get all attendance records for a class.
 */
export async function getAttendanceForClass(classId) {
  const snap = await getDocs(ownerQuery([where('classId', '==', classId)]));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAttendanceForStudent(studentId) {
  const snap = await getDocs(ownerQuery([where('studentId', '==', studentId)]));
  const records = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  records.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return records;
}

/**
 * Get the attendance state for a class on a specific date.
 * This returns a map studentId -> { id, status, ... } plus the record ids
 * used to update later.
 */
export async function getAttendanceForDate(classId, date) {
  const dateStr = typeof date === 'string' ? date : toISODate(date);
  const snap = await getDocs(
    query(attendanceRef(), where('classId', '==', classId), where('date', '==', dateStr), where('teacherId', '==', getCurrentUser().uid))
  );
  const map = {};
  snap.forEach((d) => {
    const data = d.data();
    map[data.studentId] = { id: d.id, ...data };
  });
  return map;
}

/**
 * Subscribe to all attendance of the current teacher (flattened),
 * joined with student/class info for history & reports.
 */
export function subscribeAllRecords(callback) {
  const user = getCurrentUser();
  const q = query(attendanceRef(), where('teacherId', '==', user.uid));
  return onSnapshot(
    q,
    (snap) => {
      const records = [];
      snap.forEach((d) => {
        const data = d.data();
        records.push({
          id: d.id,
          ...data,
          recordTime: data.timeRecorded?.toDate ? data.timeRecorded.toDate() : data.timeRecorded,
        });
      });
      callback(records);
    },
    (err) => {
      console.error('subscribeAllRecords:', err);
      callback([], err);
    }
  );
}

export function subscribeClassRecords(classId, callback) {
  const user = getCurrentUser();
  const q = query(
    attendanceRef(),
    where('teacherId', '==', user.uid),
    where('classId', '==', classId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const records = [];
      snap.forEach((d) => {
        const data = d.data();
        records.push({
          id: d.id,
          ...data,
          recordTime: data.timeRecorded?.toDate ? data.timeRecorded.toDate() : data.timeRecorded,
        });
      });
      records.sort((a, b) => String(a.date).localeCompare(String(b.date)));
      callback(records);
    },
    (err) => {
      console.error('subscribeClassRecords:', err);
      callback([], err);
    }
  );
}

/**
 * Get a single attendance record by id.
 */
export async function fetchAttendanceRecord(id) {
  const snap = await getDoc(doc(db, 'attendance', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Save attendance for a class on a date.
 * Creates records for students without one, updates existing records.
 * @param {string} classId
 * @param {string} date YYYY-MM-DD
 * @param {Object} statusMap studentId -> status
 * @returns summary { created, updated, skipped }
 */
export async function saveAttendance(classId, date, statusMap, students) {
  const user = getCurrentUser();
  const dateStr = typeof date === 'string' ? date : toISODate(date);
  const existing = await getAttendanceForDate(classId, dateStr);

  const batch = writeBatch(db);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const now = serverTimestamp();

  for (const student of students) {
    const status = statusMap[student.id];
    if (!status) {
      skipped += 1;
      continue;
    }
    const prev = existing[student.id];
    if (prev) {
      batch.update(doc(db, 'attendance', prev.id), { status, timeRecorded: now });
      updated += 1;
    } else {
      const ref = doc(collection(db, 'attendance'));
      batch.set(ref, {
        classId,
        studentId: student.id,
        teacherId: user.uid,
        date: dateStr,
        status,
        timeRecorded: now,
        createdAt: now,
      });
      created += 1;
    }
  }

  await batch.commit();
  return { created, updated, skipped };
}

/**
 * Delete a single attendance record (used in history edit flows).
 */
export async function deleteAttendanceRecord(id) {
  await deleteDoc(doc(db, 'attendance', id));
}