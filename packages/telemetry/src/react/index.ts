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
import { Component, ReactNode } from 'react';

registerTelemetry();

export interface FirebaseTelemetryProps {
  firebaseOptions?: FirebaseOptions;
  children?: ReactNode;
}

export class FirebaseTelemetry extends Component<FirebaseTelemetryProps> {
  constructor(public props: FirebaseTelemetryProps) {
    super(props);
  }

  componentDidMount(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // TODO: This will be removed once there is a default endpoint
    process.env.OTEL_ENDPOINT = window.location.origin;

    try {
      const telemetry = this.props.firebaseOptions
        ? getTelemetry(initializeApp(this.props.firebaseOptions))
        : getTelemetry();

      window.addEventListener('error', (event: ErrorEvent) => {
        captureError(telemetry, event.error, {});
      });

      window.addEventListener(
        'unhandledrejection',
        (event: PromiseRejectionEvent) => {
          captureError(telemetry, event.reason, {});
        }
      );
    } catch (error) {
      // Log the error here, but don't die.
      console.warn(`Firebase Telemetry was not initialized:\n`, error);
    }
  }

  render(): ReactNode {
    return this.props.children;
  }
}
