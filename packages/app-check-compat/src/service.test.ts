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

import { AppCheckService } from './service';
import firebase, { FirebaseApp } from '@firebase/app-compat';
import * as appCheckExp from '@firebase/app-check';
import {
  AppCheck,
  CustomProvider,
  ReCaptchaV3Provider
} from '@firebase/app-check';
import { AppCheckTokenResult } from '@firebase/app-check-types';
import { PartialObserver } from '@firebase/util';
import { AppCheckError } from './errors';

vi.mock('@firebase/app-check', { spy: true });

function createTestService(app: FirebaseApp): AppCheckService {
  return new AppCheckService(app);
}

function createActivatedTestService(app: FirebaseApp): AppCheckService {
  const service = new AppCheckService(app);
  const initializeAppCheckSpy = vi
    .spyOn(appCheckExp, 'initializeAppCheck')
    .mockReturnValue({} as AppCheck);
  service.activate('a-site-key');
  initializeAppCheckSpy.mockRestore();
  return service;
}

describe('Firebase App Check > Service', () => {
  let app: FirebaseApp;
  let service: AppCheckService;

  beforeEach(() => {
    app = firebase.initializeApp({
      apiKey: '456_LETTERS_AND_1234NUMBERS',
      appId: '123lettersand:numbers',
      projectId: 'my-project',
      messagingSenderId: 'messaging-sender-id'
    });
  });

  afterEach(async () => {
    await app.delete();
  });

  it(
    'activate("string") calls modular initializeAppCheck() with a ' +
      'ReCaptchaV3Provider',
    () => {
      const initializeAppCheckSpy = vi
        .spyOn(appCheckExp, 'initializeAppCheck')
        .mockReturnValue({} as AppCheck);
      service = new AppCheckService(app);
      service.activate('my_site_key');
      expect(initializeAppCheckSpy).toHaveBeenCalledWith(app, {
        provider: expect.any(ReCaptchaV3Provider),
        isTokenAutoRefreshEnabled: undefined
      });
    }
  );

  it(
    'activate({getToken: () => token}) calls modular initializeAppCheck() with' +
      ' a CustomProvider',
    () => {
      const initializeAppCheckSpy = vi
        .spyOn(appCheckExp, 'initializeAppCheck')
        .mockReturnValue({} as AppCheck);
      service = new AppCheckService(app);
      const customGetTokenStub = vi.fn();
      service.activate({
        getToken: customGetTokenStub
      });
      expect(initializeAppCheckSpy).toHaveBeenCalledWith(app, {
        provider: expect.objectContaining({
          _customProviderOptions: expect.objectContaining({
            getToken: customGetTokenStub
          })
        }),
        isTokenAutoRefreshEnabled: undefined
      });
    }
  );

  it(
    'activate(new RecaptchaV3Provider(...)) calls modular initializeAppCheck() with' +
      ' a RecaptchaV3Provider',
    () => {
      const initializeAppCheckSpy = vi
        .spyOn(appCheckExp, 'initializeAppCheck')
        .mockReturnValue({} as AppCheck);
      service = new AppCheckService(app);
      service.activate(new ReCaptchaV3Provider('a-site-key'));
      expect(initializeAppCheckSpy).toHaveBeenCalledWith(app, {
        provider: expect.any(ReCaptchaV3Provider),
        isTokenAutoRefreshEnabled: undefined
      });
    }
  );

  it(
    'activate(new CustomProvider(...)) calls modular initializeAppCheck() with' +
      ' a CustomProvider',
    () => {
      const initializeAppCheckSpy = vi
        .spyOn(appCheckExp, 'initializeAppCheck')
        .mockReturnValue({} as AppCheck);
      service = new AppCheckService(app);
      const customGetTokenStub = vi.fn();
      service.activate(new CustomProvider({ getToken: customGetTokenStub }));
      expect(initializeAppCheckSpy).toHaveBeenCalledWith(app, {
        provider: expect.any(CustomProvider),
        isTokenAutoRefreshEnabled: undefined
      });
    }
  );

  it('setTokenAutoRefreshEnabled() calls modular setTokenAutoRefreshEnabled()', () => {
    const setTokenAutoRefreshEnabledSpy = vi
      .spyOn(appCheckExp, 'setTokenAutoRefreshEnabled')
      .mockReturnValue();
    service = createActivatedTestService(app);
    service.setTokenAutoRefreshEnabled(true);
    expect(setTokenAutoRefreshEnabledSpy).toHaveBeenCalledWith(
      service._delegate,
      true
    );
  });

  it('getToken() calls modular getToken()', async () => {
    service = createActivatedTestService(app);
    const getTokenSpy = vi
      .spyOn(appCheckExp, 'getToken')
      .mockResolvedValue({} as any);
    await service.getToken(true);
    expect(getTokenSpy).toHaveBeenCalledWith(service._delegate, true);
  });

  it('onTokenChanged() calls modular onTokenChanged() with observer', () => {
    const onTokenChangedSpy = vi
      .spyOn(appCheckExp, 'onTokenChanged')
      .mockReturnValue(() => {});
    service = createActivatedTestService(app);
    const observer: PartialObserver<AppCheckTokenResult> = {
      next: vi.fn(),
      error: vi.fn()
    };
    service.onTokenChanged(observer);
    expect(onTokenChangedSpy).toHaveBeenCalledWith(
      service._delegate,
      observer,
      undefined,
      undefined
    );
  });

  it('onTokenChanged() calls modular onTokenChanged() with next/error fns', () => {
    const onTokenChangedSpy = vi
      .spyOn(appCheckExp, 'onTokenChanged')
      .mockReturnValue(() => {});
    service = createActivatedTestService(app);
    const nextFn = vi.fn();
    const errorFn = vi.fn();
    service.onTokenChanged(nextFn, errorFn);
    expect(onTokenChangedSpy).toHaveBeenCalledWith(
      service._delegate,
      nextFn,
      errorFn,
      undefined
    );
  });

  it('setTokenAutoRefreshEnabled() throws if activate() has not been called', () => {
    service = createTestService(app);
    expect(() => service.setTokenAutoRefreshEnabled(true)).toThrow(
      AppCheckError.USE_BEFORE_ACTIVATION
    );
  });

  it('getToken() throws if activate() has not been called', () => {
    service = createTestService(app);
    expect(() => service.getToken(true)).toThrow(
      AppCheckError.USE_BEFORE_ACTIVATION
    );
  });

  it('onTokenChanged() throws if activate() has not been called', () => {
    service = createTestService(app);
    expect(() => service.onTokenChanged(() => {})).toThrow(
      AppCheckError.USE_BEFORE_ACTIVATION
    );
  });
});
