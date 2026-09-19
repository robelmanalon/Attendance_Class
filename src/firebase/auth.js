import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { firebaseApp } from './config';
import { createUserRecord } from '../services/userService';

export const auth = firebaseApp ? getAuth(firebaseApp) : null;

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export async function registerUser({ name, email, password }) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  if (name) {
    await updateProfile(user, { displayName: name });
  }
  await createUserRecord({
    uid: user.uid,
    name: name || user.email,
    email: user.email,
  });
  return user;
}

export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function logoutUser() {
  await signOut(auth);
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function updateUserProfile({ name, photoURL }) {
  const user = getCurrentUser();
  if (!user) throw new Error('No signed-in user.');
  const updates = {};
  if (name) updates.displayName = name;
  if (photoURL !== undefined) updates.photoURL = photoURL;
  if (Object.keys(updates).length > 0) {
    await updateProfile(user, updates);
  }
  return user;
}