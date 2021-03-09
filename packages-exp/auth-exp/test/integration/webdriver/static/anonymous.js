import {
  signInAnonymously,
} from '@firebase/auth-exp';

export async function anonymous() {
  const userCred = await signInAnonymously(auth);
  return userCred;
};