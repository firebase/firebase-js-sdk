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

// tslint:disable

// Declaration file for using Firebase internals. This is not a complete
// definition, but enough for our use of the internals
// TODO(b/38276045): Ideally we wouldn't have to define this file ourselves

declare interface FirebaseServiceFactory {
  (app: firebase.app.App, extendApp?: (props: {[prop: string]: any}) => void,
   instanceString?: string): FirebaseService;
}

declare interface FirebaseServiceNamespace<T extends FirebaseService> {
  (app?: firebase.app.App): T;
}

declare interface FirebaseService {
  app: firebase.app.App;
  INTERNAL: {delete(): Promise<void>}
}

declare namespace firebase.app {
  interface App {
    INTERNAL: {
      getUid(): string | null;
      getToken(forceRefresh?: boolean): Promise<{accessToken: string}|null>;
      addAuthTokenListener(fn: (token: string|null) => void): void;
      removeAuthTokenListener(fn: (token: string|null) => void): void;
    }
  }
}

declare interface FirebaseError {
  // Unique code for error - format is service/error-code-string
  code: string;

  // Developer-friendly error message.
  message: string;

  // Always 'FirebaseError'
  name: string;

  // Where available - stack backtrace in a string
  stack: string;
}

declare interface FirebaseNamespace {
  INTERNAL: {
    Promise: PromiseConstructor;

    registerService(
        name: string, createService: FirebaseServiceFactory,
        serviceProperties?: {[prop: string]: any}):
        FirebaseServiceNamespace<FirebaseService>;

    /**
     * Use to construct all thrown FirebaseErrors.
     */
    ErrorFactory: FirebaseErrorFactoryClass;
  }
}

declare interface FirebaseErrorFactoryClass {
  new(service: string, serviceName: string,
      errors: {[code: string]: string}): FirebaseErrorFactory<any>;
}

declare interface FirebaseErrorFactory<T> {
  create(code: T, data?: {[prop: string]: any}): FirebaseError;
}