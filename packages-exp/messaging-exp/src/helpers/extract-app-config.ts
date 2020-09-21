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

import { ERROR_FACTORY, ErrorCode } from '../util/errors';
import { FirebaseApp, FirebaseOptions } from '@firebase/app-types';

import { AppConfig } from '../interfaces/app-config';
import { FirebaseError } from '@firebase/util';

export function extractAppConfig(app: FirebaseApp): AppConfig {
  if (!app || !app.options) {
    throw getMissingValueError('App Configuration Object');
  }

  if (!app.name) {
    throw getMissingValueError('App Name');
  }

  // Required app config keys
  const configKeys: ReadonlyArray<keyof FirebaseOptions> = [
    'projectId',
    'apiKey',
    'appId',
    'messagingSenderId'
  ];

  const { options } = app;
  for (const keyName of configKeys) {
    if (!options[keyName]) {
      throw getMissingValueError(keyName);
    }
  }

  return {
    appName: app.name,
    projectId: options.projectId!,
    apiKey: options.apiKey!,
    appId: options.appId!,
    senderId: options.messagingSenderId!
  };
}

function getMissingValueError(valueName: string): FirebaseError {
  return ERROR_FACTORY.create(ErrorCode.MISSING_APP_CONFIG_VALUES, {
    valueName
  });
}
