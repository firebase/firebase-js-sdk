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
import { Reference, _getChild } from './reference';
import { Provider } from '@firebase/component';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { AppCheckInternalComponentName } from '@firebase/app-check-interop-types';
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  FirebaseApp,
  FirebaseOptions,
  _isFirebaseServerApp
} from '@firebase/app';
import {
  CONFIG_STORAGE_BUCKET_KEY,
  DEFAULT_HOST,
  DEFAULT_MAX_OPERATION_RETRY_TIME,
  DEFAULT_MAX_UPLOAD_RETRY_TIME
} from './implementation/constants';
import {
  invalidArgument,
  appDeleted,
  noDefaultBucket
} from './implementation/error';
import { validateNumber } from './implementation/type';
import { FirebaseStorage } from './public-types';
import {
  createMockUserToken,
  EmulatorMockTokenOptions,
  isCloudWorkstation
} from '@firebase/util';
import { Connection, ConnectionType } from './implementation/connection';

export function isUrl(path?: string): boolean {
  return /^[A-Za-z]+:\/\//.test(path as string);
}

/**
 * Returns a firebaseStorage.Reference for the given url.
 */
function refFromURL(service: FirebaseStorageImpl, url: string): Reference {
  return new Reference(service, url);
}

/**
 * Returns a firebaseStorage.Reference for the given path in the default
 * bucket.
 */
function refFromPath(
  ref: FirebaseStorageImpl | Reference,
  path?: string
): Reference {
  if (ref instanceof FirebaseStorageImpl) {
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
export function ref(storage: FirebaseStorageImpl, url?: string): Reference;
/**
 * Returns a storage Reference for the given path in the
 * default bucket.
 * @param storageOrRef - `Storage` service or storage `Reference`.
 * @param pathOrUrlStorage - path. If empty, returns root reference (if Storage
 * instance provided) or returns same reference (if Reference provided).
 * @public
 */
export function ref(
  storageOrRef: FirebaseStorageImpl | Reference,
  path?: string
): Reference;
export function ref(
  serviceOrRef: FirebaseStorageImpl | Reference,
  pathOrUrl?: string
): Reference | null {
  if (pathOrUrl && isUrl(pathOrUrl)) {
    if (serviceOrRef instanceof FirebaseStorageImpl) {
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

export function connectStorageEmulator(
  storage: FirebaseStorageImpl,
  host: string,
  port: number,
  options: {
    mockUserToken?: EmulatorMockTokenOptions | string;
  } = {}
): void {
  storage.host = `${host}:${port}`;
  const useSsl = isCloudWorkstation(host);
  storage._protocol = useSsl ? 'https' : 'http';
  const { mockUserToken } = options;
  if (mockUserToken) {
    storage._overrideAuthToken =
      typeof mockUserToken === 'string'
        ? mockUserToken
        : createMockUserToken(mockUserToken, storage.app.options.projectId);
  }
}

/**
 * A service that provides Firebase Storage Reference instances.
 * @param opt_url - gs:// url to a custom Storage Bucket
 *
 * @internal
 */
export class FirebaseStorageImpl implements FirebaseStorage {
  _bucket: Location | null = null;
  /**
   * This string can be in the formats:
   * - host
   * - host:port
   */
  private _host: string = DEFAULT_HOST;
  _protocol: string = 'https';
  protected readonly _appId: string | null = null;
  private readonly _requests: Set<Request<unknown>>;
  private _deleted: boolean = false;
  private _maxOperationRetryTime: number;
  private _maxUploadRetryTime: number;
  _overrideAuthToken?: string;

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

  /**
   * The host string for this service, in the form of `host` or
   * `host:port`.
   */
  get host(): string {
    return this._host;
  }

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
    if (this._overrideAuthToken) {
      return this._overrideAuthToken;
    }
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
    if (_isFirebaseServerApp(this.app) && this.app.settings.appCheckToken) {
      return this.app.settings.appCheckToken;
    }
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
    if (!this._deleted) {
      this._deleted = true;
      this._requests.forEach(request => request.cancel());
      this._requests.clear();
    }
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
  _makeRequest<I extends ConnectionType, O>(
    requestInfo: RequestInfo<I, O>,
    requestFactory: () => Connection<I>,
    authToken: string | null,
    appCheckToken: string | null,
    retry = true
  ): Request<O> {
    if (!this._deleted) {
      const request = makeRequest(
        requestInfo,
        this._appId,
        authToken,
        appCheckToken,
        requestFactory,
        this._firebaseVersion,
        retry
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

  async makeRequestWithTokens<I extends ConnectionType, O>(
    requestInfo: RequestInfo<I, O>,
    requestFactory: () => Connection<I>
  ): Promise<O> {
    const [authToken, appCheckToken] = await Promise.all([
      this._getAuthToken(),
      this._getAppCheckToken()
    ]);

    return this._makeRequest(
      requestInfo,
      requestFactory,
      authToken,
      appCheckToken
    ).getPromise();
  }
}
