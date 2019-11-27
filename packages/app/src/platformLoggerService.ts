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

import { ComponentContainer, ComponentType } from '@firebase/component';
import { VersionService } from './version-service';
import { PLATFORM_LOG_STRING } from './constants';

export class PlatformLoggerService {
  constructor(private readonly container: ComponentContainer) {}
  // In initial implementation, this will be called by installations on
  // auth token refresh, and installations will send this string.
  getPlatformInfoString(): string {
    const providers = this.container.getProviders();
    // Loop through providers and get library/version pairs from any that are
    // version components.
    return providers
      .map(provider => {
        const service = provider.getImmediate() as VersionService;
        const component = provider.getComponent();
        if (service && component?.type === ComponentType.VERSION) {
          // TODO: We can use this check to whitelist strings when/if we set up
          // a good whitelist system.
          const platformString =
            PLATFORM_LOG_STRING[
              service.library as keyof typeof PLATFORM_LOG_STRING
            ] ?? service.library;
          return `${platformString}/${service.version}`;
        } else {
          return null;
        }
      })
      .filter(logString => logString)
      .join(' ');
  }
}
