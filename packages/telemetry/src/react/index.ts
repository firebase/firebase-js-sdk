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

import { FirebaseOptions, initializeApp } from '@firebase/app';
import { registerTelemetry } from '../register';
import { captureError, getTelemetry } from '../api';
import { useEffect } from 'react';

registerTelemetry();

function errorListener(event: ErrorEvent): void {
  captureError(getTelemetry(), event.error, {});
}

function unhandledRejectionListener(event: PromiseRejectionEvent): void {
  captureError(getTelemetry(), event.reason, {});
}

/**
 * Registers event listeners for uncaught errors.
 *
 * This should be installed near the root of your application. Caught errors, including those
 * implicitly caught by Error Boundaries, will not be captured by this component.
 *
 * @example
 * ```html
 * <body>
 *  <FirebaseTelemetry firebaseOptions={options} />
 *  ... my app ...
 * </body>
 * ```
 *
 * @param firebaseOptions - Options to run {@link @firebase/app#initializeApp}. If this is not provided, initializeApp needs to be called explicitly elsewhere in your application.
 * @returns The default {@link Telemetry} instance for the given {@link @firebase/app#FirebaseApp}.
 *
 * @public
 */
export function FirebaseTelemetry({
  firebaseOptions
}: {
  firebaseOptions?: FirebaseOptions;
}): null {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // TODO: This will be removed once there is a default endpoint
    process.env.OTEL_ENDPOINT = window.location.origin;

    try {
      if (firebaseOptions) {
        initializeApp(firebaseOptions);
      }
      window.addEventListener('error', errorListener);
      window.addEventListener('unhandledrejection', unhandledRejectionListener);
    } catch (error) {
      // Log the error here, but don't die.
      console.warn(`Firebase Telemetry was not initialized:\n`, error);
    }
    return () => {
      window.removeEventListener('error', errorListener);
      window.removeEventListener(
        'unhandledrejection',
        unhandledRejectionListener
      );
    };
  }, []);

  return null;
}
