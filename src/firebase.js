import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// The API key is read from .env.local (never committed). It still ends up in
// the built site, as with every web app; it is protected by the HTTP referrer
// restrictions set on it in Google Cloud and by firestore.rules.
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
if (!apiKey) {
  throw new Error('Lipsește VITE_FIREBASE_API_KEY. Creează fișierul .env.local (vezi CITESTE.md).');
}

const firebaseConfig = {
  apiKey,
  authDomain: 'khaled-arena.firebaseapp.com',
  projectId: 'khaled-arena',
  storageBucket: 'khaled-arena.firebasestorage.app',
  messagingSenderId: '750506827057',
  appId: '1:750506827057:web:7c05667d90a889e33f2410'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
