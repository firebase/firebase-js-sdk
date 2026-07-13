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

import { ErrorHandler, inject, DestroyRef } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  NavigationEnd,
  Router,
  DefaultUrlSerializer,
  UrlSegmentGroup
} from '@angular/router';
import { registerCrashlytics } from '../register';
import { recordError, getCrashlytics, logViewBoundary } from '../api';
import { Crashlytics, CrashlyticsOptions } from '../public-types';
import { FirebaseApp } from '@firebase/app';
import { CrashlyticsInternal } from '../types';

registerCrashlytics();

export * from '../public-types';

/**
 * Constructs the safe, templated route path from the router state.
 * Example output: '/users/:id/posts'
 *
 * @internal
 */
export function getSafeRoutePath(router: Router): string {
  let currentRoute: ActivatedRouteSnapshot = router.routerState.snapshot.root;

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

/**
 * Recursively traverses the parsed URL segment group tree and clears the parameter map
 * of each segment to strip out all Angular matrix parameters (e.g. `;id=123`).
 */
function stripMatrixParams(group: UrlSegmentGroup): void {
  for (const segment of group.segments) {
    segment.parameters = {};
  }
  for (const child of Object.values(group.children)) {
    stripMatrixParams(child);
  }
}

/**
 * Extracts the raw path portion from a full URL by stripping query parameters, hashes, and matrix parameters.
 *
 * @internal
 */
export function getRawPath(url: string): string {
  const serializer = new DefaultUrlSerializer();
  const urlTree = serializer.parse(url);
  urlTree.queryParams = {};
  urlTree.fragment = null;
  stripMatrixParams(urlTree.root);
  return serializer.serialize(urlTree);
}

/**
 * A custom ErrorHandler that captures uncaught errors and sends them to Firebase Crashlytics.
 *
 * This should be provided in your application's root module.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ApplicationConfig, ErrorHandler } from '@angular/core';
 * import { FirebaseErrorHandler } from 'firebase/crashlytics-angular';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     {
 *       provide: ErrorHandler,
 *       useFactory: () => new FirebaseErrorHandler(firebaseApp)
 *     }
 *   ],
 *   // ...
 * };
 * ```
 *
 * @example
 * Providing telemetry options:
 * ```typescript
 * import { ApplicationConfig, ErrorHandler } from '@angular/core';
 * import { FirebaseErrorHandler } from 'firebase/crashlytics-angular';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     {
 *       provide: ErrorHandler,
 *       useFactory: () => new FirebaseErrorHandler(firebaseApp, { appVersion: '1.2.3' })
 *     }
 *   ],
 *   // ...
 * };
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
    const attributesStore = (this.crashlytics as CrashlyticsInternal)
      .attributesStore;
    attributesStore.setRoutePathProvider(() => getSafeRoutePath(this.router));
  }

  handleError(error: unknown): void {
    recordError(this.crashlytics, error);
  }
}

/**
 * Configures automatic Angular router navigation tracking for Firebase Crashlytics.
 *
 * This function subscribes to router navigation events, keeps the Crashlytics route path attribute
 * updated, and logs view boundary telemetry automatically.
 *
 * @example
 * ```typescript
 * import { ApplicationConfig, ErrorHandler, inject, DestroyRef } from '@angular/core';
 * import { Router } from '@angular/router';
 * import { FirebaseErrorHandler, setupNavigationTracking } from '@firebase/crashlytics/angular';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     {
 *       provide: ErrorHandler,
 *       useFactory: () => new FirebaseErrorHandler(firebaseApp)
 *     },
 *     provideEnvironmentInitializer(() => {
 *       inject(ErrorHandler);
 *       setupNavigationTracking(
 *         firebaseApp,
 *         inject(Router),
 *         inject(DestroyRef)
 *       );
 *     })
 *   ]
 * };
 * ```
 *
 * @param app - The {@link @firebase/app#FirebaseApp} instance to use.
 * @param router - The Angular {@link @angular/router#Router} instance to subscribe to.
 * @param destroyRef - The {@link @angular/core#DestroyRef} instance to bind teardown logic to.
 * @param crashlyticsOptions - Optional. {@link CrashlyticsOptions} that configure the Crashlytics instance.
 *
 * @public
 */
export function setupNavigationTracking(
  app: FirebaseApp,
  router: Router,
  destroyRef: DestroyRef,
  crashlyticsOptions?: CrashlyticsOptions
): void {
  const crashlytics = getCrashlytics(app, crashlyticsOptions);
  const attributesStore = (crashlytics as CrashlyticsInternal).attributesStore;

  attributesStore.setRoutePathProvider(() => getSafeRoutePath(router));

  let lastRawPath: string | undefined = undefined;
  if (router.navigated) {
    const initialPattern = getSafeRoutePath(router);
    lastRawPath = getRawPath(router.url);
    logViewBoundary(crashlytics, initialPattern);
  }

  const subscription = router.events.subscribe(event => {
    if (event instanceof NavigationEnd) {
      const currentRawPath = getRawPath(event.urlAfterRedirects);
      if (currentRawPath !== lastRawPath) {
        lastRawPath = currentRawPath;
        const pattern = getSafeRoutePath(router);
        logViewBoundary(crashlytics, pattern);
      }
    }
  });

  destroyRef.onDestroy(() => {
    attributesStore.setRoutePathProvider(undefined);
    subscription.unsubscribe();
  });
}
