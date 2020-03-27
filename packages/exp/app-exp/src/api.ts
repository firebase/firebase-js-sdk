/**
 * @license
 * Copyright 2019 Google Inc.
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

import {
  FirebaseAppNext,
  FirebaseOptionsNext,
  FirebaseAppConfigNext,
  FirebaseAppInternalNext
} from '@firebase/app-types-exp';
import { DEFAULT_ENTRY_NAME, PLATFORM_LOG_STRING } from '../constants';
import { ERROR_FACTORY, AppError } from '../errors';
import {
  ComponentContainer,
  Component,
  Name,
  ComponentType
} from '@firebase/component';
import { version } from '../../firebase/package.json';
import { FirebaseAppImplNext } from './firebaseApp';
import { apps, components, registerComponent } from './internal';
import { logger } from '../logger';

export const SDK_VERSION = version;

export function initializeApp(
  options: FirebaseOptionsNext,
  config?: FirebaseAppConfigNext
): FirebaseAppNext;
export function initializeApp(
  options: FirebaseOptionsNext,
  name?: string
): FirebaseAppNext;
export function initializeApp(
  options: FirebaseOptionsNext,
  rawConfig = {}
): FirebaseAppNext {
  if (typeof rawConfig !== 'object') {
    const name = rawConfig;
    rawConfig = { name };
  }

  const config: Required<FirebaseAppConfigNext> = {
    name: DEFAULT_ENTRY_NAME,
    automaticDataCollectionEnabled: false,
    ...rawConfig
  };
  const name = config.name;

  if (typeof name !== 'string' || !name) {
    throw ERROR_FACTORY.create(AppError.BAD_APP_NAME, {
      appName: String(name)
    });
  }

  if (apps.has(name)) {
    throw ERROR_FACTORY.create(AppError.DUPLICATE_APP, { appName: name });
  }

  const container = new ComponentContainer(name);
  for (const component of components.values()) {
    container.addComponent(component);
  }

  const newApp = new FirebaseAppImplNext(options, config, container);

  apps.set(name, newApp);

  return newApp;
}

export function getApp(name: string = DEFAULT_ENTRY_NAME): FirebaseAppNext {
  const app = apps.get(name);
  if (!app) {
    throw ERROR_FACTORY.create(AppError.NO_APP, { appName: name });
  }

  return app;
}

export function getApps(): FirebaseAppNext[] {
  return Array.from(apps.values());
}

export async function deleteApp(app: FirebaseAppNext): Promise<void> {
  const name = app.name;
  if (apps.has(name)) {
    apps.delete(name);
    await (app as FirebaseAppInternalNext).container.getProviders().map(provider => provider.delete());
    (app as FirebaseAppInternalNext).isDeleted = true;
  }
}

export function registerVersion(
  libraryKeyOrName: string,
  version: string,
  variant?: string
): void {
  // TODO: We can use this check to whitelist strings when/if we set up
  // a good whitelist system.
  let library = PLATFORM_LOG_STRING[libraryKeyOrName] ?? libraryKeyOrName;
  if (variant) {
    library += `-${variant}`;
  }
  const libraryMismatch = library.match(/\s|\//);
  const versionMismatch = version.match(/\s|\//);
  if (libraryMismatch || versionMismatch) {
    const warning = [
      `Unable to register library "${library}" with version "${version}":`
    ];
    if (libraryMismatch) {
      warning.push(
        `library name "${library}" contains illegal characters (whitespace or "/")`
      );
    }
    if (libraryMismatch && versionMismatch) {
      warning.push('and');
    }
    if (versionMismatch) {
      warning.push(
        `version name "${version}" contains illegal characters (whitespace or "/")`
      );
    }
    logger.warn(warning.join(' '));
    return;
  }
  registerComponent(
    new Component(
      `${library}-version` as Name,
      () => ({ library, version }),
      ComponentType.VERSION
    )
  );
}
