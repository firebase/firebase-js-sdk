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
import { useEffect } from 'react';

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
