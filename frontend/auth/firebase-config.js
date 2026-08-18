// Firebase configuration for Indo Dev.

export const firebaseConfig = {
  apiKey: 'AIzaSyARtWJ46hs6HEVYAASm19r55EwbycgFY2I',
  authDomain: 'indo-dev-d150f.firebaseapp.com',
  projectId: 'indo-dev-d150f',
  storageBucket: 'indo-dev-d150f.firebasestorage.app',
  messagingSenderId: '1055323979335',
  appId: '1:1055323979335:web:ebd7217748446c21b97b62',
  measurementId: 'G-9KD7XEJEYJ'
};

export const realtimeDatabaseUrl = 'https://indo-dev-d150f-default-rtdb.asia-southeast1.firebasedatabase.app/';

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && realtimeDatabaseUrl);
}
