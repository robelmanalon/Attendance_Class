import { db } from '../firebase/firestore';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { getCurrentUser } from '../firebase/auth';

export const studentsRef = () => collection(db, 'students');

function studentsForClassQuery(classId) {
  return query(
    studentsRef(),
    where('classId', '==', classId),
    where('teacherId', '==', getCurrentUser().uid)
  );
}

const timeOf = (x) => (x && typeof x.getTime === 'function' ? x.getTime() : 0);

export async function getStudentsForClass(classId) {
  const snap = await getDocs(studentsForClassQuery(classId));
  const students = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  students.sort((a, b) => timeOf(a.createdAt) - timeOf(b.createdAt));
  return students;
}

/**
 * Subscribe to students of a specific class.
 */
export function subscribeStudents(classId, callback) {
  const q = studentsForClassQuery(classId);
  return onSnapshot(
    q,
    (snap) => {
      const students = [];
      snap.forEach((d) => {
        const data = d.data();
        students.push({
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        });
      });
      students.sort((a, b) => timeOf(a.createdAt) - timeOf(b.createdAt));
      callback(students);
    },
    (err) => {
      console.error('subscribeStudents:', err);
      callback([], err);
    }
  );
}

/**
 * Subscribe to students across all of the teacher's classes (flat list).
 */
export function subscribeAllStudents(callback) {
  const user = getCurrentUser();
  const q = query(studentsRef(), where('teacherId', '==', user.uid));
  return onSnapshot(
    q,
    (snap) => {
      const students = [];
      snap.forEach((d) => {
        const data = d.data();
        students.push({
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        });
      });
      callback(students);
    },
    (err) => {
      console.error('subscribeAllStudents:', err);
      callback([], err);
    }
  );
}

export async function fetchStudent(id) {
  const snap = await getDoc(doc(db, 'students', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createStudent(data) {
  const user = getCurrentUser();
  const payload = {
    classId: data.classId,
    teacherId: user.uid,
    studentNumber: (data.studentNumber || '').trim().toUpperCase(),
    fullName: (data.fullName || '').trim(),
    email: (data.email || '').trim(),
    status: data.status || 'active',
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(studentsRef(), payload);
  return { id: ref.id, ...payload };
}

export async function updateStudent(id, data) {
  const payload = {
    studentNumber: (data.studentNumber || '').trim().toUpperCase(),
    fullName: (data.fullName || '').trim(),
    email: (data.email || '').trim(),
    status: data.status || 'active',
    updatedAt: serverTimestamp(),
  };
  await updateDoc(doc(db, 'students', id), payload);
}

export async function deleteStudent(id) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'students', id));
  const attRef = collection(db, 'attendance');
  const q = query(attRef, where('studentId', '==', id));
  const snap = await getDocs(q);
  snap.forEach((d) => batch.delete(doc(attRef, d.id)));
  await batch.commit();
}

export async function deleteStudentsForClass(classId) {
  const students = await getStudentsForClass(classId);
  const batch = writeBatch(db);
  for (const st of students) {
    batch.delete(doc(db, 'students', st.id));
  }
  await batch.commit();
}

/**
 * Import a parsed list of students into a class in a batch.
 * Deduplicates by (classId + studentNumber) and by studentNumber within class.
 * Returns { imported, skippedDuplicates, skippedExisting, errors }
 */
export async function importStudents(classId, parsedEntries, onProgress) {
  const user = getCurrentUser();
  const existing = await getStudentsForClass(classId);
  const existingSet = new Set(
    existing.map((s) => String(s.studentNumber || '').toUpperCase()).filter(Boolean)
  );
  const batch = writeBatch(db);
  let imported = 0;
  let skippedDuplicates = 0;
  let skippedExisting = 0;
  const errors = [];

  // Generate missing student numbers with a class-specific counter.
  let counter = existing.length + 1;
  const inBatch = new Set();

  for (const entry of parsedEntries) {
    let num = entry.studentNumber ? String(entry.studentNumber).toUpperCase() : null;
    const name = (entry.fullName || '').trim();
    if (!name) {
      errors.push({ entry, reason: 'Missing name' });
      continue;
    }
    if (!num) {
      const year = new Date().getFullYear();
      num = `${year}-${String(counter).padStart(3, '0')}`;
      counter += 1;
    }
    if (existingSet.has(num)) {
      skippedExisting += 1;
      continue;
    }
    if (inBatch.has(num)) {
      skippedDuplicates += 1;
      continue;
    }
    inBatch.add(num);
    const ref = doc(collection(db, 'students'));
    batch.set(ref, {
      classId,
      teacherId: user.uid,
      studentNumber: num,
      fullName: name,
      email: '',
      status: 'active',
      createdAt: serverTimestamp(),
    });
    imported += 1;
    if (onProgress) onProgress(imported, parsedEntries.length);
  }

  if (imported > 0) {
    await batch.commit();
  }
  return { imported, skippedDuplicates, skippedExisting, errors };
}