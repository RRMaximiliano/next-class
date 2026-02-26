import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from './firebaseConfig';

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const { displayName, email, photoURL, uid } = result.user;
  return { displayName, email, photoURL, uid };
}

export function signOutUser() {
  return signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      const { displayName, email, photoURL, uid } = user;
      callback({ displayName, email, photoURL, uid });
    } else {
      callback(null);
    }
  });
}
