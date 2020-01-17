import { Persistence } from '.';
import { User } from '../../model/user';

const AUTH_USER_KEY_NAME_ = 'authUser';

export class UserManager {
  constructor(public persistence: Persistence) {}

  setCurrentUser(user: User): Promise<void> {
    return this.persistence.set(AUTH_USER_KEY_NAME_, JSON.stringify(user));
  }

  async getCurrentUser(): Promise<User | undefined> {
    const json = await this.persistence.get(AUTH_USER_KEY_NAME_);
    if (!json) {
      return undefined;
    }
    return JSON.parse(json);
  }

  removeCurrentUser(): Promise<void> {
    return this.persistence.remove(AUTH_USER_KEY_NAME_);
  }
}
