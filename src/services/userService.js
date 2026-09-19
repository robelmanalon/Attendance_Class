import { db } from '../firebase/firestore';
import { getCurrentUser } from '../firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';

export async function createUserRecord({ uid, name, email }) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, {
    name: name || '',
    email: email || '',
    createdAt: serverTimestamp(),
  });
  return ref;
}

export function getUserRef(uid) {
  return doc(db, 'users', uid);
}

export async function getUser(uid) {
  const snap = await getDoc(getUserRef(uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function updateUser(uid, data) {
  const ref = getUserRef(uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  } else {
    await createUserRecord({ uid, name: data.name || '', email: data.email || '' });
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  }
}

export async function deleteUserRecord(uid) {
  await deleteDoc(getUserRef(uid));
}

export async function getOwnProfile() {
  const user = getCurrentUser();
  if (!user) return null;
  return getUser(user.uid);
}