// ✅ Firebase Console → Project Settings → Your Apps → Web App
// সেখান থেকে config copy করে এখানে বসাও

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDZdamkrAJ78TOR3O57aBz_ZbHet75g_Lo",
  authDomain: "cinema-hub-550a2.firebaseapp.com",
  projectId: "cinema-hub-550a2",
  storageBucket: "cinema-hub-550a2.firebasestorage.app",
  messagingSenderId: "1095311533232",
  appId: "1:1095311533232:web:eb85396bb667ec50808775"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
