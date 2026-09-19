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
import { getStudentsForClass, deleteStudentsForClass } from './studentService';

export const classesRef = () => collection(db, 'classes');

function ownQuery() {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user.');
  return query(classesRef(), where('teacherId', '==', user.uid));
}

const timeOf = (x) => (x && typeof x.getTime === 'function' ? x.getTime() : 0);

/**
 * Subscribe to the current teacher's classes.
 */
export function subscribeClasses(callback) {
  const q = ownQuery();
  return onSnapshot(q, (snap) => {
    const classes = [];
    snap.forEach((d) => {
      const data = d.data();
      classes.push({
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      });
    });
    classes.sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt));
    callback(classes);
  }, (err) => {
    console.error('subscribeClasses:', err);
    callback([], err);
  });
}

export async function fetchClasses() {
  const q = ownQuery();
  const snap = await getDocs(q);
  const classes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  classes.sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt));
  return classes;
}

export async function fetchClass(id) {
  const snap = await getDoc(doc(db, 'classes', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createClass(data) {
  const user = getCurrentUser();
  const payload = {
    teacherId: user.uid,
    subjectName: (data.subjectName || '').trim(),
    section: (data.section || '').trim(),
    instructor: (data.instructor || '').trim(),
    schoolYear: (data.schoolYear || '').trim(),
    semester: (data.semester || '').trim(),
    schedule: (data.schedule || '').trim(),
    room: (data.room || '').trim(),
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(classesRef(), payload);
  return { id: ref.id, ...payload };
}

export async function updateClass(id, data) {
  const user = getCurrentUser();
  const payload = {
    subjectName: (data.subjectName || '').trim(),
    section: (data.section || '').trim(),
    instructor: (data.instructor || '').trim(),
    schoolYear: (data.schoolYear || '').trim(),
    semester: (data.semester || '').trim(),
    schedule: (data.schedule || '').trim(),
    room: (data.room || '').trim(),
    updatedAt: serverTimestamp(),
  };
  await updateDoc(doc(db, 'classes', id), payload);
}

export async function deleteClass(id) {
  const students = await getStudentsForClass(id);
  const batch = writeBatch(db);
  const studentsRef = collection(db, 'students');
  for (const st of students) {
    batch.delete(doc(studentsRef, st.id));
  }
  // Attendance records are scoped by classId too - clean them up as well.
  const attRef = collection(db, 'attendance');
  const q = query(attRef, where('classId', '==', id));
  const attSnap = await getDocs(q);
  attSnap.forEach((d) => batch.delete(doc(attRef, d.id)));
  batch.delete(doc(db, 'classes', id));
  await batch.commit();
}

export async function deleteStudentsForClassDirect(classId) {
  return deleteStudentsForClass(classId);
}