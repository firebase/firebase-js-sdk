/**
 * @license
 * Copyright 2017 Google LLC
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

import { VersionService } from '@firebase/app-types';
import { expect } from 'chai';
import '../test/setup';
import { PlatformLoggerService } from './platformLoggerService';
import {
  Component,
  ComponentType,
  ComponentContainer
} from '@firebase/component';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'vs1': VersionService;
    'vs2': VersionService;
  }
}

describe('Platform Logger Service', () => {
  describe('Unit Tests', () => {
    it(`logs core version`, () => {
      const container = new ComponentContainer('testContainer');
      container.addComponent(
        new Component(
          'vs1',
          () => ({ library: 'vs1', version: '1.2.3' }),
          ComponentType.VERSION
        )
      );
      container.addComponent(
        new Component(
          'vs2',
          () => ({ library: 'vs2', version: '3.02.01' }),
          ComponentType.VERSION
        )
      );
      const platformLoggerService = new PlatformLoggerService(container);
      const platformInfoString = platformLoggerService.getPlatformInfoString();
      expect(platformInfoString).to.include('vs1/1.2.3');
      expect(platformInfoString).to.include('vs2/3.02.01');
    });
  });
});
