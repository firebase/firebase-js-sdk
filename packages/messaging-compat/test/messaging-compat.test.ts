/**
 * @license
 * Copyright 2020 Google LLC
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

import * as messagingModule from '@firebase/messaging';
import * as messagingModuleInSw from '@firebase/messaging/sw';

import { getFakeApp, getFakeModularMessaging } from './fakes';

import { MessagingCompatImpl } from '../src/messaging-compat';

vi.mock('@firebase/messaging', { spy: true });
vi.mock('@firebase/messaging/sw', { spy: true });

describe('messagingCompat', () => {
  let messagingCompat: MessagingCompatImpl;
  let getTokenSpy: any;
  let deleteTokenSpy: any;
  let onMessageSpy: any;
  let onBackgroundMessageSpy: any;

  beforeEach(() => {
    messagingCompat = new MessagingCompatImpl(
      getFakeApp(),
      getFakeModularMessaging()
    );
    getTokenSpy = vi
      .spyOn(messagingModule, 'getToken')
      .mockResolvedValue('fake-token');
    deleteTokenSpy = vi
      .spyOn(messagingModule, 'deleteToken')
      .mockResolvedValue(true);
    onMessageSpy = vi
      .spyOn(messagingModule, 'onMessage')
      .mockReturnValue(() => {});
    onBackgroundMessageSpy = vi
      .spyOn(messagingModuleInSw, 'onBackgroundMessage')
      .mockReturnValue(() => {});
  });

  it('routes messagingCompat.getToken to modular SDK', async () => {
    await messagingCompat.getToken();
    expect(getTokenSpy).toHaveBeenCalledWith(
      messagingCompat._delegate,
      undefined
    );
  });

  it('routes messagingCompat.deleteToken to modular SDK', async () => {
    await messagingCompat.deleteToken();
    expect(deleteTokenSpy).toHaveBeenCalledWith(messagingCompat._delegate);
  });

  it('routes messagingCompat.onMessage to modular SDK', () => {
    const nextFn = (): void => {};
    messagingCompat.onMessage(nextFn);
    expect(onMessageSpy).toHaveBeenCalledWith(
      messagingCompat._delegate,
      nextFn
    );
  });

  it('routes messagingCompat.onBackgroundMessage to modular SDK', () => {
    const nextFn = (): void => {};
    messagingCompat.onBackgroundMessage(nextFn);
    expect(onBackgroundMessageSpy).toHaveBeenCalledWith(
      messagingCompat._delegate,
      nextFn
    );
  });
});
