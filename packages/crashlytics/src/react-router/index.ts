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

import { FirebaseApp } from '@firebase/app';
import { registerCrashlytics } from '../register';
import { recordError, getCrashlytics } from '../api';
import { CrashlyticsOptions } from '../public-types';
import React from 'react';
import {
  Routes as RoutesRR,
  RoutesProps,
  useLocation,
  createRoutesFromChildren,
  matchRoutes
} from 'react-router-dom';
import { CrashlyticsErrorBoundary } from './types';
import { FRAMEWORK_ATTRIBUTE_KEYS } from '../constants';

registerCrashlytics();

export * from '../public-types';

/**
 * A wrapper around {@link react-router-dom#Routes} that automatically captures errors in route components.
 *
 * This component acts as a replacement for `Routes` from `react-router-dom`. It wraps the routes
 * in an error boundary that captures errors thrown during rendering and reports them to Crashlytics.
 * The error boundary is reset on navigation (path changes).
 *
 * @example
 * ```tsx
 * import { useEffect, useState } from "react";
 * import { CrashlyticsRoutes } from "@firebase/crashlytics/react-router";
 * import { FirebaseApp, initializeApp } from "@firebase/app";
 *
 * export default function MyApp() {
 *   const [app, setApp] = useState<FirebaseApp | null>(null);
 *
 *   useEffect(() => {
 *     if (getApps().length === 0) {
 *       const newApp = initializeApp({...});
 *       setApp(newApp);
 *     } else {
 *       setApp(getApp());
 *     }
 *   }, []);
 *
 *   return (
 *     <>
 *       {app && (
 *         <CrashlyticsRoutes firebaseApp={app}>
 *           <Route path="/" element={<Home />} />
 *           <Route path="/about" element={<About />} />
 *         </CrashlyticsRoutes>
 *       )}
 *       ...
 *     </>
 *   );
 * }
 * ```
 *
 * @param firebaseApp - The {@link @firebase/app#FirebaseApp} instance to use.
 * @param crashlyticsOptions - {@link CrashlyticsOptions} that configure the Crashlytics instance.
 * @returns The rendered routes wrapped in an error boundary.
 *
 * @public
 */
export function CrashlyticsRoutes({
  firebaseApp,
  crashlyticsOptions,
  children,
  ...props
}: RoutesProps & {
  firebaseApp: FirebaseApp;
  crashlyticsOptions?: CrashlyticsOptions;
}): React.ReactElement | null {
  const location = useLocation();
  const crashlytics = getCrashlytics(firebaseApp, crashlyticsOptions);

  // Determine the current route pattern from the location and routes
  // Example: `/users/:id/details`
  const routes = createRoutesFromChildren(children);
  const matches = matchRoutes(routes, location);
  const pathFromRoot =
    matches
      ?.map(m => (m.route.path === '/' ? '' : m.route.path))
      .filter(p => p !== undefined && p !== '')
      .join('/') || '';
  const pattern = pathFromRoot.startsWith('/')
    ? pathFromRoot
    : `/${pathFromRoot}`;

  const onError = (error: Error): void => {
    recordError(crashlytics, error, {
      [FRAMEWORK_ATTRIBUTE_KEYS.ROUTE_PATH]: pattern
    });
  };

  return React.createElement(CrashlyticsErrorBoundary, {
    onError,
    key: location.pathname,
    children: React.createElement(RoutesRR, props, children)
  });
}
