import { LocationNext } from "./location";
import { StorageNext } from '@firebase/storage-types/next';

export interface StorageInternalNext extends StorageNext {
    _maxOperationRetryTime: number;
    _maxUploadRetryTime: number;
    bucket: LocationNext;
}