import { FirebaseApp } from '@firebase/app-types';
import { FirebaseStorage } from '@firebase/storage';
import { StorageServiceCompat } from '../src/service';

export function makeTestCompatStorage(app: FirebaseApp, storage: FirebaseStorage): StorageServiceCompat {
    const storageServiceCompat: StorageServiceCompat = new StorageServiceCompat(
        app,
        storage
      );
      return storageServiceCompat;
}

export const fakeApp = {} as FirebaseApp;
export const fakeStorage = {} as FirebaseStorage;