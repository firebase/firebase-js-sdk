import { Persistence, PersistenceType } from '.';

class InMemoryPersistence implements Persistence {
  type: PersistenceType = PersistenceType.NONE;
  storage: {
    [key: string]: string;
  } = {};

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async set(key: string, value: string): Promise<void> {
    this.storage[key] = value;
  }

  async get(key: string): Promise<string | null> {
    let value = this.storage[key];
    return value === undefined ? null : value;
  }

  async remove(key: string): Promise<void> {
    delete this.storage[key];
  }
}

export const inMemoryPersistence: Persistence = new InMemoryPersistence();
