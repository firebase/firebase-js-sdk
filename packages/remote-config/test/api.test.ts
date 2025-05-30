/**
 * @license
 * Copyright 2025 Google LLC
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
import {
  ConfigUpdateObserver,
  ensureInitialized,
  fetchAndActivate,
  FetchResponse,
  getRemoteConfig,
  getString,
  onConfigUpdate
} from '../src';
import '../test/setup';
import {
  deleteApp,
  FirebaseApp,
  initializeApp,
  _addOrOverwriteComponent
} from '@firebase/app';
import * as sinon from 'sinon';
import { Component, ComponentType } from '@firebase/component';
import { FirebaseInstallations } from '@firebase/installations-types';
import { openDatabase, APP_NAMESPACE_STORE } from '../src/storage/storage';
import { ERROR_FACTORY, ErrorCode } from '../src/errors';
import { RemoteConfig as RemoteConfigImpl } from '../src/remote_config';

const fakeFirebaseConfig = {
  apiKey: 'api-key',
  authDomain: 'project-id.firebaseapp.com',
  databaseURL: 'https://project-id.firebaseio.com',
  projectId: 'project-id',
  storageBucket: 'project-id.appspot.com',
  messagingSenderId: 'sender-id',
  appId: '1:111:web:a1234'
};

const mockObserver = {
  next: sinon.stub(),
  error: sinon.stub(),
  complete: sinon.stub()
};

async function clearDatabase(): Promise<void> {
  const db = await openDatabase();
  db.transaction([APP_NAMESPACE_STORE], 'readwrite')
    .objectStore(APP_NAMESPACE_STORE)
    .clear();
}

describe('Remote Config API', () => {
  let app: FirebaseApp;
  const STUB_FETCH_RESPONSE: FetchResponse = {
    status: 200,
    eTag: 'asdf',
    config: { 'foobar': 'hello world' },
    templateVersion: 1,
    experiments: [{
      experimentId: "_exp_1",
      variantId : "1",
      experimentStartTime : "2025-04-06T14:13:57.597Z",
      triggerTimeoutMillis : "15552000000",
      timeToLiveMillis : "15552000000"
    }]
  };
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    fetchStub = sinon.stub(window, 'fetch');
    app = initializeApp(fakeFirebaseConfig);
    _addOrOverwriteComponent(
      app,
      new Component(
        'installations-internal',
        () => {
          return {
            getId: () => Promise.resolve('fis-id'),
            getToken: () => Promise.resolve('fis-token')
          } as any as FirebaseInstallations;
        },
        ComponentType.PUBLIC
      ) as any
    );
  });

  afterEach(async () => {
    fetchStub.restore();
    await clearDatabase();
    await deleteApp(app);
  });

  function setFetchResponse(response: FetchResponse = { status: 200 }): void {
    fetchStub.returns(
      Promise.resolve({
        ok: response.status === 200,
        status: response.status,
        headers: new Headers({ ETag: response.eTag || '' }),
        json: () =>
          Promise.resolve({
            entries: response.config,
            state: 'OK',
            templateVersion: response.templateVersion,
            experimentDescriptions: response.experiments,
          })
      } as Response)
    );
  }

  it('allows multiple initializations if options are same', () => {
    const rc = getRemoteConfig(app, { templateId: 'altTemplate' });
    const rc2 = getRemoteConfig(app, { templateId: 'altTemplate' });
    expect(rc).to.equal(rc2);
  });

  it('throws an error if options are different', () => {
    getRemoteConfig(app);
    expect(() => {
      getRemoteConfig(app, { templateId: 'altTemplate' });
    }).to.throw(/Remote Config already initialized/);
  });

  it('makes a fetch call', async () => {
    const rc = getRemoteConfig(app);
    setFetchResponse(STUB_FETCH_RESPONSE);
    await fetchAndActivate(rc);
    await ensureInitialized(rc);
    expect(getString(rc, 'foobar')).to.equal('hello world');
  });

  it('calls fetch with default templateId', async () => {
    const rc = getRemoteConfig(app);
    setFetchResponse();
    await fetchAndActivate(rc);
    await ensureInitialized(rc);
    expect(fetchStub).to.be.calledOnceWith(
      'https://firebaseremoteconfig.googleapis.com/v1/projects/project-id/namespaces/firebase:fetch?key=api-key',
      sinon.match.object
    );
  });

  it('calls fetch with alternate templateId', async () => {
    const rc = getRemoteConfig(app, { templateId: 'altTemplate' });
    setFetchResponse();
    await fetchAndActivate(rc);
    expect(fetchStub).to.be.calledOnceWith(
      'https://firebaseremoteconfig.googleapis.com/v1/projects/project-id/namespaces/altTemplate:fetch?key=api-key',
      sinon.match.object
    );
  });

  it('hydrates with initialFetchResponse', async () => {
    const rc = getRemoteConfig(app, {
      initialFetchResponse: STUB_FETCH_RESPONSE
    });
    await ensureInitialized(rc);
    expect(getString(rc, 'foobar')).to.equal('hello world');
  });

  describe('onConfigUpdate', () => {
    let capturedObserver: ConfigUpdateObserver | undefined;
    let rc: RemoteConfigImpl;
    let addObserverStub: sinon.SinonStub;
    let removeObserverStub: sinon.SinonStub;

    beforeEach(() => {
      rc = getRemoteConfig(app) as RemoteConfigImpl;

      addObserverStub = sinon
        .stub(rc._realtimeHandler, 'addObserver')
        .resolves();
      removeObserverStub = sinon
        .stub(rc._realtimeHandler, 'removeObserver')
        .resolves();

      addObserverStub.callsFake(async (observer: ConfigUpdateObserver) => {
        capturedObserver = observer;
      });
    });

    afterEach(() => {
      capturedObserver = undefined;
      addObserverStub.restore();
      removeObserverStub.restore();
    });

    it('should call addObserver on the internal realtimeHandler', async () => {
      await onConfigUpdate(rc, mockObserver);
      expect(addObserverStub).to.have.been.calledOnce;
      expect(addObserverStub).to.have.been.calledWith(mockObserver);
    });

    it('should return an unsubscribe function', async () => {
      const unsubscribe = await onConfigUpdate(rc, mockObserver);
      expect(unsubscribe).to.be.a('function');
    });

    it('returned unsubscribe function should call removeObserver', async () => {
      const unsubscribe = await onConfigUpdate(rc, mockObserver);

      unsubscribe();
      expect(removeObserverStub).to.have.been.calledOnce;
      expect(removeObserverStub).to.have.been.calledWith(mockObserver);
    });

    it('observer.next should be called when realtimeHandler propagates an update', async () => {
      await onConfigUpdate(rc, mockObserver);

      if (capturedObserver && capturedObserver.next) {
        const mockConfigUpdate = { getUpdatedKeys: () => new Set(['new_key']) };
        capturedObserver.next(mockConfigUpdate);
      } else {
        expect.fail('Observer was not captured or next method is missing.');
      }

      expect(mockObserver.next).to.have.been.calledOnce;
      expect(mockObserver.next).to.have.been.calledWithMatch({
        getUpdatedKeys: sinon.match.func
      });
      expect(
        mockObserver.next.getCall(0).args[0].getUpdatedKeys()
      ).to.deep.equal(new Set(['new_key']));
    });

    it('observer.error should be called when realtimeHandler propagates an error', async () => {
      await onConfigUpdate(rc, mockObserver);

      if (capturedObserver && capturedObserver.error) {
        const expectedOriginalErrorMessage = 'Realtime stream error';
        const mockError = ERROR_FACTORY.create(
          ErrorCode.CONFIG_UPDATE_STREAM_ERROR,
          {
            originalErrorMessage: expectedOriginalErrorMessage
          }
        );
        capturedObserver.error(mockError);
      } else {
        expect.fail('Observer was not captured or error method is missing.');
      }

      expect(mockObserver.error).to.have.been.calledOnce;
      const receivedError = mockObserver.error.getCall(0).args[0];

      expect(receivedError.message).to.equal(
        'Remote Config: The stream was not able to connect to the backend: Realtime stream error. (remoteconfig/stream-error).'
      );
      expect(receivedError).to.have.nested.property(
        'customData.originalErrorMessage',
        'Realtime stream error'
      );
      expect((receivedError as any).code).to.equal('remoteconfig/stream-error');
    });
  });
});
