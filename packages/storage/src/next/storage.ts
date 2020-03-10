import { StorageNext } from '@firebase/storage-types/next';
import { FirebaseAppNext } from '@firebase/app-types/next';
import { 
    DEFAULT_MAX_OPERATION_RETRY_TIME, 
    DEFAULT_MAX_UPLOAD_RETRY_TIME
} from '../implementation/constants';
import { makeFromBucketSpec, LocationNext } from './location';

export class StorageImplNext implements StorageNext{

    private _maxUploadRetryTime: number = DEFAULT_MAX_UPLOAD_RETRY_TIME;
    private _maxOperationRetryTime: number = DEFAULT_MAX_OPERATION_RETRY_TIME;
    private bucket: LocationNext | null = null; // TODO: add to proposal
    constructor(
        readonly app: FirebaseAppNext,
        url?: string
    ) {
        // TODO: need to revisit. Not sure if it is correct
        if (url != null) {
            this.bucket = makeFromBucketSpec(url);
        } else {
            const bucketString = app.options.storageBucket || null;
            if (bucketString !== null) {
                this.bucket = makeFromBucketSpec(bucketString);
            }
        }
    }

    get maxUploadRetryTime(): number {
        return this._maxUploadRetryTime;
    }

    get maxOperationRetryTime(): number {
        return this._maxOperationRetryTime;
    }

}