/**
 * @license
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

import { FirebaseApp } from '@firebase/app-types';
import * as args from './implementation/args';
import { AuthWrapper } from './implementation/authwrapper';
import { Location } from './implementation/location';
import * as RequestExports from './implementation/request';
import { XhrIoPool } from './implementation/xhriopool';
import { Reference } from './reference';

/**
 * A service that provides firebaseStorage.Reference instances.
 * @param opt_url gs:// url to a custom Storage Bucket
 *
 * @struct
 */
export class Service {
  authWrapper_: AuthWrapper;
  private app_: FirebaseApp;
  private bucket_: Location | null = null;
  private internals_: ServiceInternals;

  constructor(app: FirebaseApp, pool: XhrIoPool, url?: string) {
    function maker(authWrapper: AuthWrapper, loc: Location): Reference {
      return new Reference(authWrapper, loc);
    }
    this.authWrapper_ = new AuthWrapper(
      app,
      maker,
      RequestExports.makeRequest,
      this,
      pool
    );
    this.app_ = app;
    if (url != null) {
      this.bucket_ = Location.makeFromBucketSpec(url);
    } else {
      const authWrapperBucket = this.authWrapper_.bucket();
      if (authWrapperBucket != null) {
        this.bucket_ = new Location(authWrapperBucket, '');
      }
    }
    this.internals_ = new ServiceInternals(this);
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

    const ref = new Reference(this.authWrapper_, this.bucket_);
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
    return new Reference(this.authWrapper_, url);
  }

  get maxUploadRetryTime(): number {
    return this.authWrapper_.maxUploadRetryTime();
  }

  setMaxUploadRetryTime(time: number): void {
    args.validate(
      'setMaxUploadRetryTime',
      [args.nonNegativeNumberSpec()],
      arguments
    );
    this.authWrapper_.setMaxUploadRetryTime(time);
  }

  setMaxOperationRetryTime(time: number): void {
    args.validate(
      'setMaxOperationRetryTime',
      [args.nonNegativeNumberSpec()],
      arguments
    );
    this.authWrapper_.setMaxOperationRetryTime(time);
  }

  get app(): FirebaseApp {
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
  service_: Service;

  constructor(service: Service) {
    this.service_ = service;
  }

  /**
   * Called when the associated app is deleted.
   * @see {!fbs.AuthWrapper.prototype.deleteApp}
   */
  delete(): Promise<void> {
    this.service_.authWrapper_.deleteApp();
    return Promise.resolve();
  }
}
