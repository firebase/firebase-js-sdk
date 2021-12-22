import { FirebaseError } from '@firebase/util';
export declare interface StorageError extends FirebaseError {
  serverResponse: string | null;
}
export {};
