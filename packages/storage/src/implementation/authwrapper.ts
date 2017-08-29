/**
* Copyright 2017 Google Inc.
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
import { Reference } from '../reference';
import { Service } from '../service';
import * as constants from './constants';
import * as errorsExports from './error';
import { errors } from './error';
import { FailRequest } from './failrequest';
import { Location } from './location';
import * as promiseimpl from './promise_external';
import { Request } from './request';
import { RequestInfo } from './requestinfo';
import { requestMaker } from './requestmaker';
import { RequestMap } from './requestmap';
import * as type from './type';
import { XhrIoPool } from './xhriopool';
import { FirebaseApp, FirebaseAuthTokenData } from '@firebase/app';

/**
 * @param app If null, getAuthToken always resolves with null.
 * @param service The storage service associated with this auth wrapper.
 *     Untyped to avoid circular type dependencies.
 * @struct
 */
export class AuthWrapper {
  private app_: FirebaseApp | null;
  private bucket_: string | null = null;

  /**
  maker
     */
  private storageRefMaker_: (p1: AuthWrapper, p2: Location) => Reference;
  private requestMaker_: requestMaker;
  private pool_: XhrIoPool;
  private service_: Service;
  private maxOperationRetryTime_: number;
  private maxUploadRetryTime_: number;
  private requestMap_: RequestMap;
  private deleted_: boolean = false;

  constructor(
    app: FirebaseApp | null,
    maker: (p1: AuthWrapper, p2: Location) => Reference,
    requestMaker: requestMaker,
    service: Service,
    pool: XhrIoPool
  ) {
    this.app_ = app;
    if (this.app_ !== null) {
      let options = this.app_.options;
      if (type.isDef(options)) {
        this.bucket_ = AuthWrapper.extractBucket_(options);
      }
    }
    this.storageRefMaker_ = maker;
    this.requestMaker_ = requestMaker;
    this.pool_ = pool;
    this.service_ = service;
    this.maxOperationRetryTime_ = constants.defaultMaxOperationRetryTime;
    this.maxUploadRetryTime_ = constants.defaultMaxUploadRetryTime;
    this.requestMap_ = new RequestMap();
  }

  private static extractBucket_(config: {
    [prop: string]: any;
  }): string | null {
    let bucketString = config[constants.configOption] || null;
    if (bucketString == null) {
      return null;
    }
    let loc: Location = Location.makeFromBucketSpec(bucketString);
    return loc.bucket;
  }

  getAuthToken(): Promise<string | null> {
    // TODO(andysoto): remove ifDef checks after firebase-app implements stubs
    // (b/28673818).
    if (
      this.app_ !== null &&
      type.isDef(this.app_.INTERNAL) &&
      type.isDef(this.app_.INTERNAL.getToken)
    ) {
      return this.app_.INTERNAL.getToken().then(
        function(response: FirebaseAuthTokenData | null): string | null {
          if (response !== null) {
            return response.accessToken;
          } else {
            return null;
          }
        },
        function(_error) {
          return null;
        }
      );
    } else {
      return promiseimpl.resolve(null) as Promise<string | null>;
    }
  }

  bucket(): string | null {
    if (this.deleted_) {
      throw errorsExports.appDeleted();
    } else {
      return this.bucket_;
    }
  }

  /**
   * The service associated with this auth wrapper. Untyped to avoid circular
   * type dependencies.
   */
  service(): Service {
    return this.service_;
  }

  /**
   * Returns a new firebaseStorage.Reference object referencing this AuthWrapper
   * at the given Location.
   * @param loc The Location.
   * @return Actually a firebaseStorage.Reference, typing not allowed
   *     because of circular dependency problems.
   */
  makeStorageReference(loc: Location): Reference {
    return this.storageRefMaker_(this, loc);
  }

  makeRequest<T>(
    requestInfo: RequestInfo<T>,
    authToken: string | null
  ): Request<T> {
    if (!this.deleted_) {
      let request = this.requestMaker_(requestInfo, authToken, this.pool_);
      this.requestMap_.addRequest(request);
      return request;
    } else {
      return new FailRequest(errorsExports.appDeleted());
    }
  }

  /**
   * Stop running requests and prevent more from being created.
   */
  deleteApp() {
    this.deleted_ = true;
    this.app_ = null;
    this.requestMap_.clear();
  }

  maxUploadRetryTime(): number {
    return this.maxUploadRetryTime_;
  }

  setMaxUploadRetryTime(time: number) {
    this.maxUploadRetryTime_ = time;
  }

  maxOperationRetryTime(): number {
    return this.maxOperationRetryTime_;
  }

  setMaxOperationRetryTime(time: number) {
    this.maxOperationRetryTime_ = time;
  }
}
