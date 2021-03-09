export function reset() {
  sessionStorage.clear();
  localStorage.clear();
  const del = indexedDB.deleteDatabase('firebaseLocalStorageDb');

  return new Promise(resolve => {
    del.addEventListener('success', () => resolve());
    del.addEventListener('error', () => resolve());
    del.addEventListener('blocked', () => resolve());
  });
};

export function authInit() {
  return new Promise(resolve => {
    auth.onAuthStateChanged(() => resolve());
  });
};

export async function userSnap() {
  return auth.currentUser;
}

export async function authSnap() {
  return auth;
}

export function signOut() {
  return auth.signOut();
}
