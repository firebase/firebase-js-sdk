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
import { captureError, getTelemetry } from './api';
import { TelemetryOptions } from './public-types';
import { getApp } from '@firebase/app';

// export { ErrorHandler, inject, ActivatedRouteSnapshot, Router };

export class FirebaseAngularErrorHandler implements ErrorHandler {
  private readonly router = inject(Router);

  constructor(private telemetryOptions?: TelemetryOptions) {}

  handleError(error: any): void {
    console.info(`[SDK] HI THIS IS AN UNCAUGHT EXCEPTION\n ${this.getSafeRoutePath(this.router)}`);

    const telemetry = getTelemetry(getApp(), this.telemetryOptions);

    const attributes = {
      'angular_route_path': this.getSafeRoutePath(this.router)
    };

    console.info('about to captureError');
    try {
    captureError(telemetry, error, attributes);
    } catch (e) {
      console.error('failed to captureError: ', e);
    } 
    console.info('successfully captured error');
  }

  /**
   * Constructs the safe, templated route path from the router state.
   * Example output: '/users/:id/posts'
   */
  private getSafeRoutePath(router: Router): string {
    let currentRoute: ActivatedRouteSnapshot | null = router.routerState.snapshot.root;
    
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
