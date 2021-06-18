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
import { expect, use } from 'chai';
import { AnalyticsService } from './service';
import { firebase, FirebaseApp } from '@firebase/app-compat';
import * as analyticsExp from '@firebase/analytics-exp';
import { stub, match, SinonStub } from 'sinon';
import * as sinonChai from 'sinon-chai';

use(sinonChai);

function createTestService(app: FirebaseApp): AnalyticsService {
  return new AnalyticsService(app, analyticsExp.getAnalytics(app));
}

describe('Firebase Analytics > Service', () => {
  let app: FirebaseApp;
  let service: AnalyticsService;
  let logEventStub: SinonStub = stub();
  let setUserIdStub: SinonStub = stub();
  let setCurrentScreenStub: SinonStub = stub();
  let setUserPropertiesStub: SinonStub = stub();
  let setAnalyticsCollectionEnabledStub: SinonStub = stub();

  before(() => {
    logEventStub = stub(analyticsExp, 'logEvent');
    setUserIdStub = stub(analyticsExp, 'setUserId');
    setCurrentScreenStub = stub(analyticsExp, 'setCurrentScreen');
    setUserPropertiesStub = stub(analyticsExp, 'setUserProperties');
    setAnalyticsCollectionEnabledStub = stub(
      analyticsExp,
      'setAnalyticsCollectionEnabled'
    );
  });

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

  after(() => {
    logEventStub.restore();
    setUserIdStub.restore();
  });

  it('logEvent() calls modular logEvent() with only event name', () => {
    service = createTestService(app);
    service.logEvent('begin_checkout');
    expect(logEventStub).to.be.calledWith(match.any, 'begin_checkout');
    logEventStub.resetHistory();
  });

  it('logEvent() calls modular logEvent() with 2 args', () => {
    service = createTestService(app);
    service.logEvent('begin_checkout', { 'currency': 'USD' });
    expect(logEventStub).to.be.calledWith(match.any, 'begin_checkout', {
      'currency': 'USD'
    });
    logEventStub.resetHistory();
  });

  it('logEvent() calls modular logEvent() with all args', () => {
    service = createTestService(app);
    service.logEvent('begin_checkout', { 'currency': 'USD' }, { global: true });
    expect(logEventStub).to.be.calledWith(
      match.any,
      'begin_checkout',
      { 'currency': 'USD' },
      { global: true }
    );
    logEventStub.resetHistory();
  });

  it('setUserId() calls modular setUserId()', () => {
    service = createTestService(app);
    service.setUserId('user123');
    expect(setUserIdStub).to.be.calledWith(match.any, 'user123');
    setUserIdStub.resetHistory();
  });

  it('setUserId() calls modular setUserId() with options if provided', () => {
    service = createTestService(app);
    service.setUserId('user123', { global: true });
    expect(setUserIdStub).to.be.calledWith(match.any, 'user123', {
      global: true
    });
    setUserIdStub.resetHistory();
  });

  it('setCurrentScreen() calls modular setCurrentScreen()', () => {
    service = createTestService(app);
    service.setCurrentScreen('some_screen');
    expect(setCurrentScreenStub).to.be.calledWith(match.any, 'some_screen');
    setCurrentScreenStub.resetHistory();
  });

  it('setCurrentScreen() calls modular setCurrentScreen() with options if provided', () => {
    service = createTestService(app);
    service.setCurrentScreen('some_screen', { global: true });
    expect(setCurrentScreenStub).to.be.calledWith(match.any, 'some_screen', {
      global: true
    });
    setCurrentScreenStub.resetHistory();
  });

  it('setUserProperties() calls modular setUserProperties()', () => {
    service = createTestService(app);
    service.setUserProperties({ 'my_custom_property': 'abc' });
    expect(setUserPropertiesStub).to.be.calledWith(match.any, {
      'my_custom_property': 'abc'
    });
    setUserPropertiesStub.resetHistory();
  });

  it('setUserProperties() calls modular setUserProperties() with options if provided', () => {
    service = createTestService(app);
    service.setUserProperties(
      { 'my_custom_property': 'abc' },
      { global: true }
    );
    expect(setUserPropertiesStub).to.be.calledWith(
      match.any,
      { 'my_custom_property': 'abc' },
      {
        global: true
      }
    );
    setCurrentScreenStub.resetHistory();
  });

  it('setAnalyticsCollectionEnabled() calls modular setAnalyticsCollectionEnabled()', () => {
    service = createTestService(app);
    service.setAnalyticsCollectionEnabled(false);
    expect(setAnalyticsCollectionEnabledStub).to.be.calledWith(
      match.any,
      false
    );
    setAnalyticsCollectionEnabledStub.resetHistory();
  });
});
