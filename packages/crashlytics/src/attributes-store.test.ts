/**
 * @license
 * Copyright 2026 Google LLC
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

import { AttributesStore, ATTR_KEY_INSTALLATION_ID } from './attributes-store';
import { _FirebaseInstallationsInternal } from '@firebase/installations';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { trace } from '@opentelemetry/api';
import { AUTO_CONSTANTS } from './auto-constants';

describe('AttributesStore', () => {
  describe('getInstallationIdAttribute', () => {
    it('should cache the installation id after the first call', async () => {
      let callCount = 0;
      const mockInstallations = {
        getId: async () => {
          callCount++;
          return 'iid-123';
        }
      } as unknown as _FirebaseInstallationsInternal;

      const mockProvider = {
        getImmediate: () => mockInstallations,
        get: async () => mockInstallations
      } as any;

      const store = new AttributesStore({} as any, {} as any, mockProvider);

      const attr1 = await store.getInstallationIdAttribute();
      expect(attr1).to.deep.equal({
        [ATTR_KEY_INSTALLATION_ID]: 'iid-123'
      });
      expect(callCount).to.equal(1);

      const attr2 = await store.getInstallationIdAttribute();
      expect(attr2).to.deep.equal({
        [ATTR_KEY_INSTALLATION_ID]: 'iid-123'
      });
      expect(callCount).to.equal(1); // Should still be 1
    });

    it('should not cache if installation id is null', async () => {
      let callCount = 0;
      let returnValue: string | null = null;
      const mockInstallations = {
        getId: async () => {
          callCount++;
          return returnValue;
        }
      } as unknown as _FirebaseInstallationsInternal;

      const mockProvider = {
        getImmediate: () => mockInstallations,
        get: async () => mockInstallations
      } as any;

      const store = new AttributesStore({} as any, {} as any, mockProvider);

      const attr1 = await store.getInstallationIdAttribute();
      expect(attr1).to.be.null;
      expect(callCount).to.equal(1);

      returnValue = 'iid-456';
      const attr2 = await store.getInstallationIdAttribute();
      expect(attr2).to.deep.equal({
        [ATTR_KEY_INSTALLATION_ID]: 'iid-456'
      });
      expect(callCount).to.equal(2);

      // Should cache now
      const attr3 = await store.getInstallationIdAttribute();
      expect(attr3).to.deep.equal({
        [ATTR_KEY_INSTALLATION_ID]: 'iid-456'
      });
      expect(callCount).to.equal(2);
    });

    it('should resolve installations provider asynchronously if not immediate', async () => {
      let resolvePromise: (value: any) => void;
      const installationsPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      const mockProvider = {
        getImmediate: () => null,
        get: () => installationsPromise
      } as any;

      const store = new AttributesStore({} as any, {} as any, mockProvider);

      // Initially, it has no installations because the promise hasn't resolved
      expect(await store.getInstallationIdAttribute()).to.be.null;

      const mockInstallations = {
        getId: async () => 'iid-async'
      } as unknown as _FirebaseInstallationsInternal;

      // Resolve the provider promise
      resolvePromise!(mockInstallations);

      // We need to yield execution so the promise callback runs
      await new Promise(resolve => setTimeout(resolve, 0));

      const attr = await store.getInstallationIdAttribute();
      expect(attr).to.deep.equal({
        [ATTR_KEY_INSTALLATION_ID]: 'iid-async'
      });
    });

    it('should handle installations provider get rejecting gracefully', async () => {
      const mockProvider = {
        getImmediate: () => null,
        get: () => Promise.reject(new Error('Failed to load installations'))
      } as any;

      const store = new AttributesStore({} as any, {} as any, mockProvider);

      // Yield to let the rejected promise handler run
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(await store.getInstallationIdAttribute()).to.be.null;
    });

    it('should return null if installations is not provided', async () => {
      const store = new AttributesStore({} as any, {} as any);
      const attr = await store.getInstallationIdAttribute();
      expect(attr).to.be.null;
    });
  });

  describe('sessionStorage integration', () => {
    let originalSessionStorage: any;

    beforeEach(() => {
      originalSessionStorage = (global as any).sessionStorage;
    });

    afterEach(() => {
      Object.defineProperty(global, 'sessionStorage', {
        value: originalSessionStorage,
        writable: true
      });
    });

    it('should load session id from sessionStorage on initialization if present', () => {
      const storage: Record<string, string> = {
        'firebasecrashlytics.sessionid': 'session-123'
      };
      const sessionStorageMock = {
        getItem: (key: string) => storage[key] || null,
        setItem: (key: string, val: string) => {
          storage[key] = val;
        }
      };
      Object.defineProperty(global, 'sessionStorage', {
        value: sessionStorageMock,
        writable: true
      });

      const store = new AttributesStore({} as any, {} as any);
      expect(store.sessionId).to.equal('session-123');
    });

    it('should set session id in sessionStorage when setSessionId is called', () => {
      const storage: Record<string, string> = {};
      const sessionStorageMock = {
        getItem: (key: string) => storage[key] || null,
        setItem: (key: string, val: string) => {
          storage[key] = val;
        }
      };
      Object.defineProperty(global, 'sessionStorage', {
        value: sessionStorageMock,
        writable: true
      });

      const store = new AttributesStore({} as any, {} as any);
      expect(store.sessionId).to.be.undefined;

      store.setSessionId('new-session');
      expect(store.sessionId).to.equal('new-session');
      expect(storage['firebasecrashlytics.sessionid']).to.equal('new-session');
    });

    it('should handle sessionStorage throwing errors on getItem gracefully', () => {
      const sessionStorageMock = {
        getItem: () => {
          throw new Error('sessionStorage access blocked');
        },
        setItem: () => {}
      };
      Object.defineProperty(global, 'sessionStorage', {
        value: sessionStorageMock,
        writable: true
      });

      // Should not throw
      const store = new AttributesStore({} as any, {} as any);
      expect(store.sessionId).to.be.undefined;
    });

    it('should handle sessionStorage throwing errors on setItem gracefully', () => {
      const sessionStorageMock = {
        getItem: () => null,
        setItem: () => {
          throw new Error('sessionStorage quota exceeded');
        }
      };
      Object.defineProperty(global, 'sessionStorage', {
        value: sessionStorageMock,
        writable: true
      });

      const store = new AttributesStore({} as any, {} as any);
      // Should not throw
      store.setSessionId('new-session');
      expect(store.sessionId).to.equal('new-session');
    });

    it('should handle undefined sessionStorage gracefully', () => {
      Object.defineProperty(global, 'sessionStorage', {
        value: undefined,
        writable: true
      });

      const store = new AttributesStore({} as any, {} as any);
      expect(store.sessionId).to.be.undefined;

      // Should not throw
      store.setSessionId('new-session');
      expect(store.sessionId).to.equal('new-session');
    });
  });

  describe('updateAppVersion', () => {
    let originalAutoConstantsVersion: any;

    beforeEach(() => {
      originalAutoConstantsVersion = AUTO_CONSTANTS.appVersion;
    });

    afterEach(() => {
      AUTO_CONSTANTS.appVersion = originalAutoConstantsVersion;
    });

    it('should use appVersion from options if provided', () => {
      const store = new AttributesStore({} as any, { appVersion: '1.2.3' });
      expect(store.getLogAttributes()).to.have.property(
        'app.build_id',
        '1.2.3'
      );
    });

    it('should fall back to AUTO_CONSTANTS appVersion if not in options', () => {
      AUTO_CONSTANTS.appVersion = '2.3.4';
      const store = new AttributesStore({} as any, {});
      expect(store.getLogAttributes()).to.have.property(
        'app.build_id',
        '2.3.4'
      );
    });

    it('should use "unset" if neither options nor AUTO_CONSTANTS appVersion are set', () => {
      AUTO_CONSTANTS.appVersion = undefined;
      const store = new AttributesStore({} as any, {});
      expect(store.getLogAttributes()).to.have.property(
        'app.build_id',
        'unset'
      );
    });

    it('should update appVersion when updateOptions is called', () => {
      const store = new AttributesStore({} as any, { appVersion: '1.2.3' });
      expect(store.getLogAttributes()).to.have.property(
        'app.build_id',
        '1.2.3'
      );

      store.updateAppVersion({ appVersion: '3.4.5' });
      expect(store.getLogAttributes()).to.have.property(
        'app.build_id',
        '3.4.5'
      );
    });
  });

  describe('getLogAttributes', () => {
    let getActiveSpanStub: sinon.SinonStub;

    beforeEach(() => {
      getActiveSpanStub = sinon.stub(trace, 'getActiveSpan');
    });

    afterEach(() => {
      getActiveSpanStub.restore();
    });

    it('should include projectId in trace context if trace and span are active', () => {
      const mockSpanContext = {
        traceId: 'mock-trace-id-1234567890abcdef',
        spanId: 'mock-span-id-123'
      };
      const mockSpan = {
        spanContext: () => mockSpanContext
      };
      getActiveSpanStub.returns(mockSpan);

      const store = new AttributesStore({ projectId: 'my-project-123' } as any);

      const logAttributes = store.getLogAttributes();
      expect(logAttributes).to.include({
        'logging.googleapis.com/trace':
          'projects/my-project-123/traces/mock-trace-id-1234567890abcdef',
        'logging.googleapis.com/spanId': 'mock-span-id-123'
      });
    });

    it('should not include trace context if getActiveSpan returns undefined', () => {
      getActiveSpanStub.returns(undefined);

      const store = new AttributesStore({ projectId: 'my-project-123' } as any);

      const logAttributes = store.getLogAttributes();
      expect(logAttributes).not.to.have.property(
        'logging.googleapis.com/trace'
      );
      expect(logAttributes).not.to.have.property(
        'logging.googleapis.com/spanId'
      );
    });
  });
});
