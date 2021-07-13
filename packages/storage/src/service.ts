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
import { ConnectionPool } from './implementation/connectionPool';
import { Reference, _getChild } from './reference';
import { Provider } from '@firebase/component';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { AppCheckInternalComponentName } from '@firebase/app-check-interop-types';
import {
  FirebaseApp,
  FirebaseOptions,
  _FirebaseService
  // eslint-disable-next-line import/no-extraneous-dependencies
} from '@firebase/app-exp';
import {
  CONFIG_STORAGE_BUCKET_KEY,
  DEFAULT_HOST,
  DEFAULT_MAX_OPERATION_RETRY_TIME,
  DEFAULT_MAX_UPLOAD_RETRY_TIME
} from '../src/implementation/constants';
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
      return _getChild(ref, path);
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

function extractBucket(
  host: string,
  config?: FirebaseOptions
): Location | null {
  const bucketString = config?.[CONFIG_STORAGE_BUCKET_KEY];
  if (bucketString == null) {
    return null;
  }
  return Location.makeFromBucketSpec(bucketString, host);
}

export function useStorageEmulator(
  storage: StorageService,
  host: string,
  port: number
): void {
  storage.host = `http://${host}:${port}`;
}

/**
 * A service that provides Firebase Storage Reference instances.
 * @public
 * @param opt_url - gs:// url to a custom Storage Bucket
 */
export class StorageService implements _FirebaseService {
  _bucket: Location | null = null;
  /**
   * This string can be in the formats:
   * - host
   * - host:port
   * - protocol://host:port
   */
  private _host: string = DEFAULT_HOST;
  protected readonly _appId: string | null = null;
  private readonly _requests: Set<Request<unknown>>;
  private _deleted: boolean = false;
  private _maxOperationRetryTime: number;
  private _maxUploadRetryTime: number;

  constructor(
    /**
     * FirebaseApp associated with this StorageService instance.
     */
    readonly app: FirebaseApp,
    readonly _authProvider: Provider<FirebaseAuthInternalName>,
    /**
     * @internal
     */
    readonly _appCheckProvider: Provider<AppCheckInternalComponentName>,
    /**
     * @internal
     */
    readonly _pool: ConnectionPool,
    readonly _url?: string,
    readonly _firebaseVersion?: string
  ) {
    this._maxOperationRetryTime = DEFAULT_MAX_OPERATION_RETRY_TIME;
    this._maxUploadRetryTime = DEFAULT_MAX_UPLOAD_RETRY_TIME;
    this._requests = new Set();
    if (_url != null) {
      this._bucket = Location.makeFromBucketSpec(_url, this._host);
    } else {
      this._bucket = extractBucket(this._host, this.app.options);
    }
  }

  get host(): string {
    return this._host;
  }

  /**
   * Set host string for this service.
   * @param host - host string in the form of host, host:port,
   * or protocol://host:port
   */
  set host(host: string) {
    this._host = host;
    if (this._url != null) {
      this._bucket = Location.makeFromBucketSpec(this._url, host);
    } else {
      this._bucket = extractBucket(host, this.app.options);
    }
  }

  /**
   * The maximum time to retry uploads in milliseconds.
   */
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

  /**
   * The maximum time to retry operations other than uploads or downloads in
   * milliseconds.
   */
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

  async _getAuthToken(): Promise<string | null> {
    const auth = this._authProvider.getImmediate({ optional: true });
    if (auth) {
      const tokenData = await auth.getToken();
      if (tokenData !== null) {
        return tokenData.accessToken;
      }
    }
    return null;
  }

  async _getAppCheckToken(): Promise<string | null> {
    const appCheck = this._appCheckProvider.getImmediate({ optional: true });
    if (appCheck) {
      const result = await appCheck.getToken();
      // TODO: What do we want to do if there is an error getting the token?
      // Context: appCheck.getToken() will never throw even if an error happened. In the error case, a dummy token will be
      // returned along with an error field describing the error. In general, we shouldn't care about the error condition and just use
      // the token (actual or dummy) to send requests.
      return result.token;
    }
    return null;
  }

  /**
   * Stop running requests and prevent more from being created.
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
  _makeStorageReference(loc: Location): Reference {
    return new Reference(this, loc);
  }

  /**
   * @param requestInfo - HTTP RequestInfo object
   * @param authToken - Firebase auth token
   */
  _makeRequest<T>(
    requestInfo: RequestInfo<T>,
    authToken: string | null,
    appCheckToken: string | null
  ): Request<T> {
    if (!this._deleted) {
      const request = makeRequest(
        requestInfo,
        this._appId,
        authToken,
        appCheckToken,
        this._pool,
        this._firebaseVersion
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

  async makeRequestWithTokens<T>(
    requestInfo: RequestInfo<T>
  ): Promise<Request<T>> {
    const [authToken, appCheckToken] = await Promise.all([
      this._getAuthToken(),
      this._getAppCheckToken()
    ]);

    return this._makeRequest(requestInfo, authToken, appCheckToken);
  }
}
