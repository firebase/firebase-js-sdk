import { Auth } from '../..';
import { IdTokenResponse } from '../../model/id_token';
import { User, StsTokenManager } from '../../model/user';

export function userFromIdTokenResponse(auth: Auth, idTokenResponse: IdTokenResponse): Promise<User> {
  const stsTokenManager = new StsTokenManager(auth.config.apiKey, idTokenResponse);
  // Initialize the Firebase Auth user.
  const user = new User(auth, stsTokenManager, idTokenResponse.localId);

  // Updates the user info and data and resolves with a user instance.
  return user.reload();
};

export async function signInWithIdTokenResponse(auth: Auth, idTokenResponse: IdTokenResponse): Promise<User> {
  await auth.isInitialized();

  const user: User = await userFromIdTokenResponse(auth, idTokenResponse);
  await auth.setCurrentUser(user);
  return user;
};
