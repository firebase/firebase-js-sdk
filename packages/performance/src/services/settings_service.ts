/**
 * @license
 * Copyright 2019 Google LLC
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
import { ERROR_FACTORY, ErrorCode } from '../utils/errors';
import { FirebaseInstallations } from '@firebase/installations-types';
import { mergeStrings } from '../utils/string_merger';

let settingsServiceInstance: SettingsService | undefined;

export class SettingsService {
  // The variable which controls logging of automatic traces and HTTP/S network monitoring.
  instrumentationEnabled = true;

  // The variable which controls logging of custom traces.
  dataCollectionEnabled = true;

  // Configuration flags set through remote config.
  loggingEnabled = false;
  // Sampling rate between 0 and 1.
  tracesSamplingRate = 1;
  networkRequestsSamplingRate = 1;

  // Address of logging service.
  logEndPointUrl =
    'https://firebaselogging.googleapis.com/v0cc/log?format=json_proto';
  // Performance event transport endpoint URL which should be compatible with proto3.
  // New Address for transport service, not configurable via Remote Config.
  flTransportEndpointUrl = mergeStrings(
    'hts/frbslgigp.ogepscmv/ieo/eaylg',
    'tp:/ieaeogn-agolai.o/1frlglgc/o'
  );

  transportKey = mergeStrings('AzSC8r6ReiGqFMyfvgow', 'Iayx0u-XT3vksVM-pIV');

  // Source type for performance event logs.
  logSource = 462;

  // Flags which control per session logging of traces and network requests.
  logTraceAfterSampling = false;
  logNetworkAfterSampling = false;

  // TTL of config retrieved from remote config in hours.
  configTimeToLive = 12;

  firebaseAppInstance!: FirebaseApp;

  installationsService!: FirebaseInstallations;

  getAppId(): string {
    const appId =
      this.firebaseAppInstance &&
      this.firebaseAppInstance.options &&
      this.firebaseAppInstance.options.appId;
    if (!appId) {
      throw ERROR_FACTORY.create(ErrorCode.NO_APP_ID);
    }
    return appId;
  }

  getProjectId(): string {
    const projectId =
      this.firebaseAppInstance &&
      this.firebaseAppInstance.options &&
      this.firebaseAppInstance.options.projectId;
    if (!projectId) {
      throw ERROR_FACTORY.create(ErrorCode.NO_PROJECT_ID);
    }
    return projectId;
  }

  getApiKey(): string {
    const apiKey =
      this.firebaseAppInstance &&
      this.firebaseAppInstance.options &&
      this.firebaseAppInstance.options.apiKey;
    if (!apiKey) {
      throw ERROR_FACTORY.create(ErrorCode.NO_API_KEY);
    }
    return apiKey;
  }

  getFlTransportFullUrl(): string {
    return this.flTransportEndpointUrl.concat('?key=', this.transportKey);
  }

  static getInstance(): SettingsService {
    if (settingsServiceInstance === undefined) {
      settingsServiceInstance = new SettingsService();
    }
    return settingsServiceInstance;
  }
}
