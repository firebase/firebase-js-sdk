import { createUserWithEmailAndPassword } from '@firebase/auth-exp';

const TEST_PASSWORD = 'password';

export function createUser(email) {
  return createUserWithEmailAndPassword(auth, email, TEST_PASSWORD);
}