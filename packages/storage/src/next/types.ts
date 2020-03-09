import { Location } from "../implementation/location";
import { StorageNext } from '@firebase/storage-types/next';

export interface StorageInternalNext extends StorageNext {
    _maxOperationRetryTime: number;
    _maxUploadRetryTime: number;
    bucket: Location;
}