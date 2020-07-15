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
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { FirebaseOptions } from '@firebase/app-types-exp';
import * as constants from '../src/implementation/constants';
import * as errorsExports from './implementation/error';

/**
 * A service that provides firebaseStorage.Reference instances.
 * @param opt_url gs:// url to a custom Storage Bucket
 *
 * @struct
 */
export class StorageService {
  private app_: FirebaseApp | null;
  private readonly bucket_: Location | null = null;
  private readonly internals_: ServiceInternals;
  private readonly authProvider_: Provider<FirebaseAuthInternalName>;
  private readonly appId_: string | null = null;
  private readonly pool_: XhrIoPool;
  private readonly requests_: Set<Request<unknown>>;
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
    this.maxOperationRetryTime_ = constants.DEFAULT_MAX_OPERATION_RETRY_TIME;
    this.maxUploadRetryTime_ = constants.DEFAULT_MAX_UPLOAD_RETRY_TIME;
    this.requests_ = new Set();
    this.pool_ = pool;
    if (url != null) {
      this.bucket_ = Location.makeFromBucketSpec(url);
    } else {
      this.bucket_ = StorageService.extractBucket_(this.app_?.options);
    }
    this.internals_ = new ServiceInternals(this);
  }

  private static extractBucket_(config?: FirebaseOptions): Location | null {
    const bucketString = config?.[constants.CONFIG_STORAGE_BUCKET_KEY];
    if (bucketString == null) {
      return null;
    }
    return Location.makeFromBucketSpec(bucketString);
  }

  async getAuthToken(): Promise<string | null> {
    const auth = this.authProvider_.getImmediate({ optional: true });
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
   */
  deleteApp(): void {
    this.deleted_ = true;
    this.app_ = null;
    this.requests_.forEach(request => request.cancel());
    this.requests_.clear();
  }

  /**
   * Returns a new firebaseStorage.Reference object referencing this StorageService
   * at the given Location.
   * @param loc The Location.
   * @return A firebaseStorage.Reference.
   */
  makeStorageReference(loc: Location): Reference {
    return new Reference(this, loc);
  }

  makeRequest<T>(
    requestInfo: RequestInfo<T>,
    authToken: string | null
  ): Request<T> {
    if (!this.deleted_) {
      const request = makeRequest(
        requestInfo,
        this.appId_,
        authToken,
        this.pool_
      );
      this.requests_.add(request);
      // Request removes itself from set when complete.
      request.getPromise().then(
        () => this.requests_.delete(request),
        () => this.requests_.delete(request)
      );
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
