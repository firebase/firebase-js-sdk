import {initializeApp} from '@firebase/app-exp';
import {getAuth, signInAnonymously, useAuthEmulator} from '@firebase/auth-exp';

let auth;

// Helper functions for tests
window.anonymous = async () => {
  const userCred = await signInAnonymously(auth);
  return userCred;
};

window.reset = () => auth.signOut();

window.authInit = () => {
  return new Promise(resolve => {
    auth.onAuthStateChanged(() => resolve());
  });
};

window.userSnap = async () => auth.currentUser;

window.authSnap = async () => auth;

// Initialize library and attach globals
(async () => {
  const app = initializeApp({
    apiKey: 'api-key',
    projectId: 'test-emulator',
    authDomain: 'http://localhost/emulator',
  });
  auth = getAuth(app);
  useAuthEmulator(auth, 'http://localhost:9099');
  window.auth = auth;
})();