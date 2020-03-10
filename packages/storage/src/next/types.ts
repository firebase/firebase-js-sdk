import { LocationNext } from "./location";
import { StorageNext, ReferenceNext } from '@firebase/storage-types/next';
import { Provider } from '@firebase/component';

export interface StorageInternalNext extends StorageNext {
    _maxOperationRetryTime: number;
    _maxUploadRetryTime: number;
    bucket: LocationNext | null;
    authProvider: Provider<'auth-internal'>
}

export interface ReferenceInternalNext extends ReferenceNext {
    location:
}