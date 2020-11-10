/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Location } from './implementation/location';
import { FailRequest } from './implementation/failrequest';
import { Request, makeRequest } from './implementation/request';
import { RequestInfo } from './implementation/requestinfo';
import { XhrIoPool } from './implementation/xhriopool';
import { Reference, getChild } from './reference';
import { Provider } from '@firebase/component';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import {
  FirebaseApp,
  FirebaseOptions,
  _FirebaseService
} from '@firebase/app-types-exp';
import * as constants from '../src/implementation/constants';
import {
  invalidArgument,
  appDeleted,
  noDefaultBucket
} from './implementation/error';
import { validateNumber } from './implementation/type';

export function isUrl(path?: string): boolean {
  return /^[A-Za-z]+:\/\//.test(path as string);
}

/**
 * Returns a firebaseStorage.Reference for the given url.
 */
function refFromURL(service: StorageService, url: string): Reference {
  return new Reference(service, url);
}

/**
 * Returns a firebaseStorage.Reference for the given path in the default
 * bucket.
 */
function refFromPath(
  ref: StorageService | Reference,
  path?: string
): Reference {
  if (ref instanceof StorageService) {
    const service = ref;
    if (service._bucket == null) {
      throw noDefaultBucket();
    }
    const reference = new Reference(service, service._bucket!);
    if (path != null) {
      return refFromPath(reference, path);
    } else {
      return reference;
    }
  } else {
    // ref is a Reference
    if (path !== undefined) {
      if (path.includes('..')) {
        throw invalidArgument('`path` param cannot contain ".."');
      }
      return getChild(ref, path);
    } else {
      return ref;
    }
  }
}

/**
 * Returns a storage Reference for the given url.
 * @param storage - `Storage` instance.
 * @param url - URL. If empty, returns root reference.
 * @public
 */
export function ref(storage: StorageService, url?: string): Reference;
/**
 * Returns a storage Reference for the given path in the
 * default bucket.
 * @param storageOrRef - `Storage` service or storage `Reference`.
 * @param pathOrUrlStorage - path. If empty, returns root reference (if Storage
 * instance provided) or returns same reference (if Reference provided).
 * @public
 */
export function ref(
  storageOrRef: StorageService | Reference,
  path?: string
): Reference;
export function ref(
  serviceOrRef: StorageService | Reference,
  pathOrUrl?: string
): Reference | null {
  if (pathOrUrl && isUrl(pathOrUrl)) {
    if (serviceOrRef instanceof StorageService) {
      return refFromURL(serviceOrRef, pathOrUrl);
    } else {
      throw invalidArgument(
        'To use ref(service, url), the first argument must be a Storage instance.'
      );
    }
  } else {
    return refFromPath(serviceOrRef, pathOrUrl);
  }
}

function extractBucket(config?: FirebaseOptions): Location | null {
  const bucketString = config?.[constants.CONFIG_STORAGE_BUCKET_KEY];
  if (bucketString == null) {
    return null;
  }
  return Location.makeFromBucketSpec(bucketString);
}

/**
 * A service that provides Firebase Storage Reference instances.
 * @param opt_url - gs:// url to a custom Storage Bucket
 */
export class StorageService implements _FirebaseService {
  /**
   * @internal
   */
  readonly _bucket: Location | null = null;
  protected readonly _appId: string | null = null;
  private readonly _requests: Set<Request<unknown>>;
  private _deleted: boolean = false;
  private _maxOperationRetryTime: number;
  private _maxUploadRetryTime: number;

  constructor(
    readonly app: FirebaseApp,
    /**
     * @internal
     */
    readonly _authProvider: Provider<FirebaseAuthInternalName>,
    /**
     * @internal
     */
    readonly _pool: XhrIoPool,
    /**
     * @internal
     */
    readonly _url?: string
  ) {
    this._maxOperationRetryTime = constants.DEFAULT_MAX_OPERATION_RETRY_TIME;
    this._maxUploadRetryTime = constants.DEFAULT_MAX_UPLOAD_RETRY_TIME;
    this._requests = new Set();
    if (_url != null) {
      this._bucket = Location.makeFromBucketSpec(_url);
    } else {
      this._bucket = extractBucket(this.app.options);
    }
  }

  get maxUploadRetryTime(): number {
    return this._maxUploadRetryTime;
  }

  set maxUploadRetryTime(time: number) {
    validateNumber(
      'time',
      /* minValue=*/ 0,
      /* maxValue= */ Number.POSITIVE_INFINITY,
      time
    );
    this._maxUploadRetryTime = time;
  }

  get maxOperationRetryTime(): number {
    return this._maxOperationRetryTime;
  }

  set maxOperationRetryTime(time: number) {
    validateNumber(
      'time',
      /* minValue=*/ 0,
      /* maxValue= */ Number.POSITIVE_INFINITY,
      time
    );
    this._maxOperationRetryTime = time;
  }

  async getAuthToken(): Promise<string | null> {
    const auth = this._authProvider.getImmediate({ optional: true });
    if (auth) {
      const tokenData = await auth.getToken();
      if (tokenData !== null) {
        return tokenData.accessToken;
      }
    }
    return null;
  }

  /**
   * Stop running requests and prevent more from being created.
   * @internal
   */
  _delete(): Promise<void> {
    this._deleted = true;
    this._requests.forEach(request => request.cancel());
    this._requests.clear();
    return Promise.resolve();
  }

  /**
   * Returns a new firebaseStorage.Reference object referencing this StorageService
   * at the given Location.
   */
  makeStorageReference(loc: Location): Reference {
    return new Reference(this, loc);
  }

  /**
   * @internal
   * @param requestInfo - HTTP RequestInfo object
   * @param authToken - Firebase auth token
   */
  makeRequest<T>(
    requestInfo: RequestInfo<T>,
    authToken: string | null
  ): Request<T> {
    if (!this._deleted) {
      const request = makeRequest(
        requestInfo,
        this._appId,
        authToken,
        this._pool
      );
      this._requests.add(request);
      // Request removes itself from set when complete.
      request.getPromise().then(
        () => this._requests.delete(request),
        () => this._requests.delete(request)
      );
      return request;
    } else {
      return new FailRequest(appDeleted());
    }
  }
}
