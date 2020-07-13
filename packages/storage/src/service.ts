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

import { FirebaseApp } from '@firebase/app-types';
import * as args from './implementation/args';
import { Location } from './implementation/location';
import { FailRequest } from './implementation/failrequest';
import { Request, makeRequest } from './implementation/request';
import { RequestInfo } from './implementation/requestinfo';
import { XhrIoPool } from './implementation/xhriopool';
import { Reference } from './reference';
import { Provider } from '@firebase/component';
import {
  FirebaseAuthInternalName,
  FirebaseAuthTokenData
} from '@firebase/auth-interop-types';
import { FirebaseOptions } from '@firebase/app-types-exp';
import * as constants from '../src/implementation/constants';
import { RequestMap } from './implementation/requestmap';
import { requestMaker } from './implementation/requestmaker';
import * as errorsExports from './implementation/error';

/**
 * A service that provides firebaseStorage.Reference instances.
 * @param opt_url gs:// url to a custom Storage Bucket
 *
 * @struct
 */
export class StorageService {
  private app_: FirebaseApp | null;
  private bucket_: Location | null = null;
  private internals_: ServiceInternals;
  private authProvider_: Provider<FirebaseAuthInternalName>;
  private appId_: string | null = null;

  private storageRefMaker_: (loc: Location) => Reference;
  private requestMaker_: requestMaker;
  private pool_: XhrIoPool;
  private requestMap_: RequestMap;
  private deleted_: boolean = false;
  private maxOperationRetryTime_: number;
  private maxUploadRetryTime_: number;

  constructor(
    app: FirebaseApp | null,
    authProvider: Provider<FirebaseAuthInternalName>,
    pool: XhrIoPool,
    url?: string
  ) {
    this.app_ = app;
    this.authProvider_ = authProvider;
    this.storageRefMaker_ = (loc: Location): Reference => {
      return new Reference(this, loc);
    };
    this.requestMaker_ = makeRequest;
    this.maxOperationRetryTime_ = constants.DEFAULT_MAX_OPERATION_RETRY_TIME;
    this.maxUploadRetryTime_ = constants.DEFAULT_MAX_UPLOAD_RETRY_TIME;
    this.requestMap_ = new RequestMap();
    this.pool_ = pool;
    if (url != null) {
      this.bucket_ = Location.makeFromBucketSpec(url);
    } else {
      const bucketFromOptions =
        this.app_ != null
          ? StorageService.extractBucket_(this.app_.options)
          : null;
      if (bucketFromOptions != null) {
        this.bucket_ = new Location(bucketFromOptions, '');
      }
    }
    this.internals_ = new ServiceInternals(this);
  }

  private static extractBucket_(config: FirebaseOptions): string | null {
    const bucketString = config[constants.CONFIG_STORAGE_BUCKET_KEY] || null;
    if (bucketString == null) {
      return null;
    }
    const loc: Location = Location.makeFromBucketSpec(bucketString);
    return loc.bucket;
  }

  getAuthToken(): Promise<string | null> {
    const auth = this.authProvider_.getImmediate({ optional: true });
    if (auth) {
      return auth.getToken().then(
        (response: FirebaseAuthTokenData | null): string | null => {
          if (response !== null) {
            return response.accessToken;
          } else {
            return null;
          }
        },
        () => null
      );
    } else {
      return Promise.resolve(null);
    }
  }

  /**
   * Stop running requests and prevent more from being created.
   */
  deleteApp(): void {
    this.deleted_ = true;
    this.app_ = null;
    this.requestMap_.clear();
  }

  /**
   * Returns a new firebaseStorage.Reference object referencing this StorageService
   * at the given Location.
   * @param loc The Location.
   * @return A firebaseStorage.Reference.
   */
  makeStorageReference(loc: Location): Reference {
    return this.storageRefMaker_(loc);
  }

  makeRequest<T>(
    requestInfo: RequestInfo<T>,
    authToken: string | null
  ): Request<T> {
    if (!this.deleted_) {
      const request = this.requestMaker_(
        requestInfo,
        this.appId_,
        authToken,
        this.pool_
      );
      this.requestMap_.addRequest(request);
      return request;
    } else {
      return new FailRequest(errorsExports.appDeleted());
    }
  }

  /**
   * Returns a firebaseStorage.Reference for the given path in the default
   * bucket.
   */
  ref(path?: string): Reference {
    function validator(path: unknown): void {
      if (typeof path !== 'string') {
        throw 'Path is not a string.';
      }
      if (/^[A-Za-z]+:\/\//.test(path as string)) {
        throw 'Expected child path but got a URL, use refFromURL instead.';
      }
    }
    args.validate('ref', [args.stringSpec(validator, true)], arguments);
    if (this.bucket_ == null) {
      throw new Error('No Storage Bucket defined in Firebase Options.');
    }

    const ref = new Reference(this, this.bucket_);
    if (path != null) {
      return ref.child(path);
    } else {
      return ref;
    }
  }

  /**
   * Returns a firebaseStorage.Reference object for the given absolute URL,
   * which must be a gs:// or http[s]:// URL.
   */
  refFromURL(url: string): Reference {
    function validator(p: unknown): void {
      if (typeof p !== 'string') {
        throw 'Path is not a string.';
      }
      if (!/^[A-Za-z]+:\/\//.test(p as string)) {
        throw 'Expected full URL but got a child path, use ref instead.';
      }
      try {
        Location.makeFromUrl(p as string);
      } catch (e) {
        throw 'Expected valid full URL but got an invalid one.';
      }
    }
    args.validate('refFromURL', [args.stringSpec(validator, false)], arguments);
    return new Reference(this, url);
  }

  get maxUploadRetryTime(): number {
    return this.maxUploadRetryTime_;
  }

  setMaxUploadRetryTime(time: number): void {
    args.validate(
      'setMaxUploadRetryTime',
      [args.nonNegativeNumberSpec()],
      arguments
    );
    this.maxUploadRetryTime_ = time;
  }

  get maxOperationRetryTime(): number {
    return this.maxOperationRetryTime_;
  }

  setMaxOperationRetryTime(time: number): void {
    args.validate(
      'setMaxOperationRetryTime',
      [args.nonNegativeNumberSpec()],
      arguments
    );
    this.maxOperationRetryTime_ = time;
  }

  get app(): FirebaseApp | null {
    return this.app_;
  }

  get INTERNAL(): ServiceInternals {
    return this.internals_;
  }
}

/**
 * @struct
 */
export class ServiceInternals {
  service_: StorageService;

  constructor(service: StorageService) {
    this.service_ = service;
  }

  /**
   * Called when the associated app is deleted.
   */
  delete(): Promise<void> {
    this.service_.deleteApp();
    return Promise.resolve();
  }
}
