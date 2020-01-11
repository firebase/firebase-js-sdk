import { Persistence, PersistenceType } from '.';

const STORAGE_AVAILABLE_KEY_ = '__sak';

class BrowserSessionPersistence implements Persistence {
    type: PersistenceType = PersistenceType.SESSION;

    async isAvailable(): Promise<boolean> {
      try {
        const storage = sessionStorage;
        if (!storage) {
          return false;
        }
        storage.setItem(STORAGE_AVAILABLE_KEY_, '1');
        storage.removeItem(STORAGE_AVAILABLE_KEY_);
        return true;
      } catch (e) {
        return false;
      }
    }
    
    async set(key: string, value: string): Promise<void> {
      sessionStorage.setItem(key, value);
    }
    
    async get(key: string): Promise<string | null> {
      return sessionStorage.getItem(key);
    }

    async remove(key: string): Promise<void> {
      sessionStorage.removeItem(key);
    }
}

export const browserSessionPersistence: Persistence = new BrowserSessionPersistence();