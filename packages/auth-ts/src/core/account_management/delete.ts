import { User } from '../../model/user'
import { deleteAccount } from '../../api/account_management'
import { Auth } from '../../model/auth'

export async function deleteUser(auth: Auth, user: User): Promise<void> {
  const idToken = await user.getIdToken();
  await deleteAccount(auth, {idToken});
  return auth.signOut();
}