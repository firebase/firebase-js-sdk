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

import { expect } from 'chai';
import '../test/setup';
import { HeartbeatServiceImpl } from './heartbeatService';
import {
  Component,
  ComponentType,
  ComponentContainer
} from '@firebase/component';
import { PlatformLoggerService } from './types';
import { FirebaseApp } from './public-types';
import { base64Decode } from '@firebase/util';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'platform-logger': PlatformLoggerService;
  }
}

describe('Heartbeat Service', () => {
  it(`logs a heartbeat`, async () => {
    const container = new ComponentContainer('heartbeatTestContainer');
    container.addComponent(
      new Component(
        'app',
        () => ({ options: { appId: 'an-app-id' }, name: 'an-app-name' } as FirebaseApp),
        ComponentType.VERSION
      )
    );
    container.addComponent(
      new Component(
        'platform-logger',
        () => ({ getPlatformInfoString: () => 'vs1/1.2.3 vs2/2.3.4' }),
        ComponentType.VERSION
      )
    );
    const heartbeatService = new HeartbeatServiceImpl(container);
    await heartbeatService.triggerHeartbeat();
    const heartbeatHeaders = base64Decode(await heartbeatService.getHeartbeatsHeader());
    expect(heartbeatHeaders).to.include('vs1/1.2.3');
    expect(heartbeatHeaders).to.include('2021-');
  });
});
