import { PersistenceValue } from '../../src/core/persistence';
import { InMemoryPersistence } from '../../src/core/persistence/in_memory';

/** Helper class for handling redirect persistence */
export class RedirectPersistence extends InMemoryPersistence {
  hasPendingRedirect = false;
  redirectUser: object|null = null;

  async _get<T extends PersistenceValue>(key: string): Promise<T|null> {
    if (key.includes('pendingRedirect')) {
      return this.hasPendingRedirect.toString() as T;
    }

    return this.redirectUser as T | null;
  }
}
