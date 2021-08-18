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

import {
  ComponentContainer,
  ComponentType,
  Provider,
  Name
} from '@firebase/component';
import { PlatformLoggerService, VersionService } from './types';

export class PlatformLoggerServiceImpl implements PlatformLoggerService {
  constructor(private readonly container: ComponentContainer) {}
  // In initial implementation, this will be called by installations on
  // auth token refresh, and installations will send this string.
  getPlatformInfoString(): string {
    const providers = this.container.getProviders();
    // Loop through providers and get library/version pairs from any that are
    // version components.
    return providers
      .map(provider => {
        if (isVersionServiceProvider(provider)) {
          const service = provider.getImmediate() as VersionService;
          return `${service.library}/${service.version}`;
        } else {
          return null;
        }
      })
      .filter(logString => logString)
      .join(' ');
  }
}
/**
 *
 * @param provider check if this provider provides a VersionService
 *
 * NOTE: Using Provider<'app-version'> is a hack to indicate that the provider
 * provides VersionService. The provider is not necessarily a 'app-version'
 * provider.
 */
function isVersionServiceProvider(provider: Provider<Name>): boolean {
  const component = provider.getComponent();
  return component?.type === ComponentType.VERSION;
}
