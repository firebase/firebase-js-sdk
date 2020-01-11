import { Auth } from "../../model/auth";
import { UserCredential } from '../../model/user_credential';
import { User } from '../../model/user';
import { signUp, signInWithPassword } from '../../api/authentication';

export async function createUserWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<UserCredential> {
  const { refreshToken, localId, idToken } = await signUp(auth, {
    returnSecureToken: true,
    email,
    password
  });
  if (!refreshToken || !idToken) {
    throw new Error('token missing');
  }
  const user = await auth.setCurrentUser(new User(refreshToken, localId, idToken));
  return new UserCredential(user);
}

export async function signInWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<UserCredential> {
  const { refreshToken, localId, idToken } = await signInWithPassword(auth, {
    email,
    password
  });   
  if (!refreshToken || !idToken) {
    throw new Error('token missing');
  }
  const user = await auth.setCurrentUser(new User(refreshToken, localId, idToken));
  return new UserCredential(user);
}