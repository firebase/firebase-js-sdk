import { ReferenceNext } from '@firebase/storage-types/next';
import { invalidRootOperation } from '../implementation/error';

export function throwIfRoot(ref: ReferenceNext, name: string): void {
    if (ref.fullPath === '') {
      throw invalidRootOperation(name);
    }
  }