export enum PersistenceType {
  SESSION = 'SESSION',
  LOCAL = 'LOCAL',
  NONE = 'NONE'
}

export interface Persistence {
  type: PersistenceType;
  isAvailable(): Promise<boolean>;
  set(key: string, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  remove(key: string): Promise<void>;
}

// export const reactNativeLocalPersistence: Persistence = { type: PersistenceType.LOCAL };
