import { Persistence, PersistenceType } from '.';

const STORAGE_AVAILABLE_KEY_ = '__sak';

class BrowserLocalPersistence implements Persistence {
    type: PersistenceType = PersistenceType.LOCAL;

    async isAvailable(): Promise<boolean> {
      try {
        const storage = localStorage;
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
      localStorage.setItem(key, value);
    }
    
    async get(key: string): Promise<string | null> {
      return localStorage.getItem(key);
    }

    async remove(key: string): Promise<void> {
      localStorage.removeItem(key);
    }
}

export const browserLocalPersistence: Persistence = new BrowserLocalPersistence();