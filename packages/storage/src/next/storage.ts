import { StorageNext } from '@firebase/storage-types/next';
import { FirebaseAppNext } from '@firebase/app-types/next';
import { 
    DEFAULT_MAX_OPERATION_RETRY_TIME, 
    DEFAULT_MAX_UPLOAD_RETRY_TIME
} from '../implementation/constants';
import { makeFromBucketSpec, LocationNext } from './location';
import { Provider } from '@firebase/component';
import { XhrIoPool } from '../implementation/xhriopool';
import { RequestMap } from '../implementation/requestmap';

export class StorageImplNext implements StorageNext{

    /**
     * @internal
     */
    _maxUploadRetryTime: number = DEFAULT_MAX_UPLOAD_RETRY_TIME;
    /**
     * @internal
     */
    _maxOperationRetryTime: number = DEFAULT_MAX_OPERATION_RETRY_TIME;
    /**
     * @internal
     */
    _bucket: LocationNext | null = null; // TODO: add to proposal
    /**
     * @internal
     */
    _authProvider: Provider<'auth-internal'>;

    /**
     * @internal
     */
    _xhrpool: XhrIoPool = new XhrIoPool();

    /**
     * @internal
     */
    _requestMap: RequestMap = new RequestMap();
    
    constructor(
        readonly app: FirebaseAppNext,
        authProvider: Provider<'auth-internal'>,
        url?: string
    ) {
        this._authProvider = authProvider;
        // TODO: need to revisit. Not sure if it is correct
        if (url != null) {
            this._bucket = makeFromBucketSpec(url);
        } else {
            const bucketString = app.options.storageBucket || null;
            if (bucketString !== null) {
                this._bucket = makeFromBucketSpec(bucketString);
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