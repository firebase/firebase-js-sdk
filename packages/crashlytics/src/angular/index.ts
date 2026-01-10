/**
 * @license
 * Copyright 2025 Google LLC
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

// eslint-disable-next-line import/no-extraneous-dependencies
import { ErrorHandler, inject } from '@angular/core';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { registerCrashlytics } from '../register';
import { recordError, getCrashlytics } from '../api';
import { Crashlytics, CrashlyticsOptions } from '../public-types';
import { FirebaseApp } from '@firebase/app';
import { CrashlyticsService } from '../service';

registerCrashlytics();

export * from '../public-types';

/**
 * A custom ErrorHandler that captures uncaught errors and sends them to Firebase Crashlytics.
 *
 * This should be provided in your application's root module.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ErrorHandler } from '@angular/core';
 * import { FirebaseErrorHandler } from 'firebase/crashlytics-angular';
 *
 * @NgModule({
 *   // ...
 *   providers: [
 *     {
 *       provide: ErrorHandler,
 *       useFactory: () => new FirebaseErrorHandler(firebaseApp)
 *     }
 *   ],
 *   // ...
 * })
 * export class AppModule { }
 * ```
 *
 * @example
 * Providing telemetry options:
 * ```typescript
 * import { ErrorHandler } from '@angular/core';
 * import { FirebaseErrorHandler } from 'firebase/crashlytics-angular';
 *
 * @NgModule({
 *   // ...
 *   providers: [
 *     {
 *       provide: ErrorHandler,
 *       useFactory: () => new FirebaseErrorHandler(firebaseApp, { appVersion: '1.2.3' })
 *     }
 *   ],
 *   // ...
 * })
 * export class AppModule { }
 * ```
 *
 * @param firebaseApp - The {@link @firebase/app#FirebaseApp} instance to use.
 * @param crashlyticsOptions - Optional. {@link CrashlyticsOptions} that configure the Crashlytics instance.
 * To provide these options, you must use a `useFactory` provider as shown in the example above.
 *
 * @public
 */
export class FirebaseErrorHandler implements ErrorHandler {
  private readonly router = inject(Router);
  private readonly crashlytics: Crashlytics;

  constructor(app: FirebaseApp, crashlyticsOptions?: CrashlyticsOptions) {
    this.crashlytics = getCrashlytics(app, crashlyticsOptions);
    (this.crashlytics as CrashlyticsService).frameworkAttributesProvider = () =>
      this.getAttributes();
  }

  handleError(error: unknown): void {
    recordError(this.crashlytics, error);
  }

  /**
   * Returns a record of framework-specific attributes based on the current application state to be
   * attached to the error log.
   */
  private getAttributes(): Record<string, string> {
    return {
      'angular_route_path': this.getSafeRoutePath(this.router)
    };
  }

  /**
   * Constructs the safe, templated route path from the router state.
   * Example output: '/users/:id/posts'
   */
  private getSafeRoutePath(router: Router): string {
    let currentRoute: ActivatedRouteSnapshot | null =
      router.routerState.snapshot.root;

    // Find the deepest activated child route
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    // Traverse up from the deepest child to the root, collecting configured paths
    const pathFromRoot = currentRoute.pathFromRoot
      .map(route => route.routeConfig?.path)
      .filter(path => path !== undefined && path !== '') // Filter out empty or undefined paths
      .join('/');

    return `/${pathFromRoot}`;
  }
}
