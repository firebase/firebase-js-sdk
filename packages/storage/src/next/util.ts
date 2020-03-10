import { FirebaseAppNext } from '@firebase/app-types/next';
import { ReferenceNext } from '@firebase/storage-types/next';
import { invalidRootOperation } from '../implementation/error';

export function storageInstanceKey(app: FirebaseAppNext, url?: string): string {
    return `${app.name}-${url}`;
}

export function throwIfRoot(ref: ReferenceNext, name: string): void {
    if (ref.fullPath === '') {
      throw invalidRootOperation(name);
    }
  }