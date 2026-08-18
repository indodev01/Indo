// Firebase configuration for Indo Dev authentication.
// Replace every REPLACE_ME value with the config from your Firebase web app.

export const firebaseConfig = {
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME',
  projectId: 'REPLACE_ME',
  storageBucket: 'REPLACE_ME',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME'
};

export function isFirebaseConfigured() {
  return !Object.values(firebaseConfig).some(function (value) {
    return String(value).includes('REPLACE_ME');
  });
}
