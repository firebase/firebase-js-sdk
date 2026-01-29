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
import React, { useEffect } from 'react';
import { Routes as RoutesRR, RoutesProps, useLocation } from 'react-router-dom';
import { CrashlyticsErrorBoundary } from './types';

registerCrashlytics();

export * from '../public-types';

/**
 * Registers event listeners for uncaught errors.
 *
 * This should be installed near the root of your application. Caught errors, including those
 * implicitly caught by Error Boundaries, will not be captured by this component.
 *
 * @example
 * ```tsx
 * import { useEffect, useState } from "react";
 * import { FirebaseCrashlytics } from "@firebase/crashlytics/react";
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
 *         <FirebaseCrashlytics
 *           firebaseApp={app}
 *           crashlyticsOptions={{...}}
 *         />
 *       )}
 *       ...
 *     </>
 *   );
 * }
 * ```
 *
 * @param firebaseApp - The {@link @firebase/app#FirebaseApp} instance to use.
 * @param crashlyticsOptions - {@link CrashlyticsOptions} that configure the Crashlytics instance.
 * @returns The default {@link Crashlytics} instance for the given {@link @firebase/app#FirebaseApp}.
 *
 * @public
 */
export function FirebaseCrashlytics({
  firebaseApp,
  crashlyticsOptions
}: {
  firebaseApp: FirebaseApp;
  crashlyticsOptions?: CrashlyticsOptions;
}): null {
  useEffect(() => {
    const crashlytics = getCrashlytics(firebaseApp, crashlyticsOptions);

    if (typeof window === 'undefined') {
      return;
    }

    const errorListener = (event: ErrorEvent): void => {
      recordError(crashlytics, event.error, {});
    };

    const unhandledRejectionListener = (event: PromiseRejectionEvent): void => {
      recordError(crashlytics, event.reason, {});
    };

    try {
      window.addEventListener('error', errorListener);
      window.addEventListener('unhandledrejection', unhandledRejectionListener);
    } catch (error) {
      // Log the error here, but don't die.
      console.warn(`Firebase Crashlytics was not initialized:\n`, error);
    }
    return () => {
      window.removeEventListener('error', errorListener);
      window.removeEventListener(
        'unhandledrejection',
        unhandledRejectionListener
      );
    };
  }, [firebaseApp, crashlyticsOptions]);

  return null;
}

/**
 * A wrapper around {@link react-router-dom#Routes} that automatically captures errors in route components.
 *
 * This component acts as a replacement for `Routes` from `react-router-dom`. It wraps the routes
 * in an error boundary that captures errors thrown during rendering and reports them to Crashlytics.
 * The error boundary is reset on navigation (path changes).
 *
 * @example
 * ```tsx
 * import { CrashlyticsRoutes } from "@firebase/crashlytics/react";
 * import { Route } from "react-router-dom";
 *
 * function App({ firebaseApp }) {
 *   return (
 *     <CrashlyticsRoutes firebaseApp={firebaseApp}>
 *       <Route path="/" element={<Home />} />
 *       <Route path="/about" element={<About />} />
 *     </CrashlyticsRoutes>
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

  const onError = (error: Error): void => {
    recordError(crashlytics, error, {
      location: location.pathname
    });
  };

  return React.createElement(CrashlyticsErrorBoundary, {
    onError,
    key: location.pathname,
    children: React.createElement(RoutesRR, props, children)
  });
}
