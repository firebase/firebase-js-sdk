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

import { AnalyticsService } from './service';
import firebase, { FirebaseApp } from '@firebase/app-compat';
import * as analyticsExp from '@firebase/analytics';

vi.mock('@firebase/analytics', { spy: true });

function createTestService(app: FirebaseApp): AnalyticsService {
  return new AnalyticsService(app, analyticsExp.getAnalytics(app));
}

describe('Firebase Analytics > Service', () => {
  let app: FirebaseApp;
  let service: AnalyticsService;
  let logEventStub = vi.fn();
  let setUserIdStub = vi.fn();
  let setCurrentScreenStub = vi.fn();
  let setUserPropertiesStub = vi.fn();
  let setAnalyticsCollectionEnabledStub = vi.fn();

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    logEventStub = vi
      .spyOn(analyticsExp, 'logEvent')
      .mockImplementation(() => {});
    setUserIdStub = vi
      .spyOn(analyticsExp, 'setUserId')
      .mockImplementation(() => {});
    setCurrentScreenStub = vi
      .spyOn(analyticsExp, 'setCurrentScreen')
      .mockImplementation(() => {});
    setUserPropertiesStub = vi
      .spyOn(analyticsExp, 'setUserProperties')
      .mockImplementation(() => {});
    setAnalyticsCollectionEnabledStub = vi
      .spyOn(analyticsExp, 'setAnalyticsCollectionEnabled')
      .mockImplementation(() => {});
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

  it('logEvent() calls modular logEvent() with only event name', () => {
    service = createTestService(app);
    service.logEvent('begin_checkout');
    expect(logEventStub).toHaveBeenCalledWith(
      expect.anything(),
      'begin_checkout',
      undefined,
      undefined
    );
    logEventStub.mockClear();
  });

  it('logEvent() calls modular logEvent() with 2 args', () => {
    service = createTestService(app);
    service.logEvent('begin_checkout', { 'currency': 'USD' });
    expect(logEventStub).toHaveBeenCalledWith(
      expect.anything(),
      'begin_checkout',
      {
        'currency': 'USD'
      },
      undefined
    );
    logEventStub.mockClear();
  });

  it('logEvent() calls modular logEvent() with all args', () => {
    service = createTestService(app);
    service.logEvent('begin_checkout', { 'currency': 'USD' }, { global: true });
    expect(logEventStub).toHaveBeenCalledWith(
      expect.anything(),
      'begin_checkout',
      { 'currency': 'USD' },
      { global: true }
    );
    logEventStub.mockClear();
  });

  it('setUserId() calls modular setUserId()', () => {
    service = createTestService(app);
    service.setUserId('user123');
    expect(setUserIdStub).toHaveBeenCalledWith(
      expect.anything(),
      'user123',
      undefined
    );
    setUserIdStub.mockClear();
  });

  it('setUserId() calls modular setUserId() with options if provided', () => {
    service = createTestService(app);
    service.setUserId('user123', { global: true });
    expect(setUserIdStub).toHaveBeenCalledWith(expect.anything(), 'user123', {
      global: true
    });
    setUserIdStub.mockClear();
  });

  it('setCurrentScreen() (deprecated) calls modular setCurrentScreen() (deprecated)', () => {
    service = createTestService(app);
    service.setCurrentScreen('some_screen');
    expect(setCurrentScreenStub).toHaveBeenCalledWith(
      expect.anything(),
      'some_screen',
      undefined
    );
    setCurrentScreenStub.mockClear();
  });

  it('setCurrentScreen() (deprecated) calls modular setCurrentScreen() (deprecated) with options if provided', () => {
    service = createTestService(app);
    service.setCurrentScreen('some_screen', { global: true });
    expect(setCurrentScreenStub).toHaveBeenCalledWith(
      expect.anything(),
      'some_screen',
      {
        global: true
      }
    );
    setCurrentScreenStub.mockClear();
  });

  it('setUserProperties() calls modular setUserProperties()', () => {
    service = createTestService(app);
    service.setUserProperties({ 'my_custom_property': 'abc' });
    expect(setUserPropertiesStub).toHaveBeenCalledWith(
      expect.anything(),
      {
        'my_custom_property': 'abc'
      },
      undefined
    );
    setUserPropertiesStub.mockClear();
  });

  it('setUserProperties() calls modular setUserProperties() with options if provided', () => {
    service = createTestService(app);
    service.setUserProperties(
      { 'my_custom_property': 'abc' },
      { global: true }
    );
    expect(setUserPropertiesStub).toHaveBeenCalledWith(
      expect.anything(),
      { 'my_custom_property': 'abc' },
      {
        global: true
      }
    );
    setUserPropertiesStub.mockClear();
  });

  it('setAnalyticsCollectionEnabled() calls modular setAnalyticsCollectionEnabled()', () => {
    service = createTestService(app);
    service.setAnalyticsCollectionEnabled(false);
    expect(setAnalyticsCollectionEnabledStub).toHaveBeenCalledWith(
      expect.anything(),
      false
    );
    setAnalyticsCollectionEnabledStub.mockClear();
  });
});
