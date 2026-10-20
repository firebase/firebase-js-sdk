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

import {
  AttributesStore,
  ATTR_KEY_INSTALLATION_ID,
  SESSION_STORAGE_SESSION_ID_KEY,
  SPAN_ATTR_KEY,
  LOG_ATTR_KEY
} from './attributes-store';
import { _FirebaseInstallationsInternal } from '@firebase/installations';
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
      expect(attr1).toEqual({
        [ATTR_KEY_INSTALLATION_ID]: 'iid-123'
      });
      expect(callCount).toBe(1);

      const attr2 = await store.getInstallationIdAttribute();
      expect(attr2).toEqual({
        [ATTR_KEY_INSTALLATION_ID]: 'iid-123'
      });
      expect(callCount).toBe(1); // Should still be 1
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
      expect(attr1).toBeNull();
      expect(callCount).toBe(1);

      returnValue = 'iid-456';
      const attr2 = await store.getInstallationIdAttribute();
      expect(attr2).toEqual({
        [ATTR_KEY_INSTALLATION_ID]: 'iid-456'
      });
      expect(callCount).toBe(2);

      // Should cache now
      const attr3 = await store.getInstallationIdAttribute();
      expect(attr3).toEqual({
        [ATTR_KEY_INSTALLATION_ID]: 'iid-456'
      });
      expect(callCount).toBe(2);
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
      expect(await store.getInstallationIdAttribute()).toBeNull();

      const mockInstallations = {
        getId: async () => 'iid-async'
      } as unknown as _FirebaseInstallationsInternal;

      // Resolve the provider promise
      resolvePromise!(mockInstallations);

      // We need to yield execution so the promise callback runs
      await new Promise(resolve => setTimeout(resolve, 0));

      const attr = await store.getInstallationIdAttribute();
      expect(attr).toEqual({
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

      expect(await store.getInstallationIdAttribute()).toBeNull();
    });

    it('should return null if installations is not provided', async () => {
      const store = new AttributesStore({} as any, {} as any);
      const attr = await store.getInstallationIdAttribute();
      expect(attr).toBeNull();
    });
  });

  describe('sessionStorage integration', () => {
    let originalSessionStorage: Storage | undefined;

    beforeEach(() => {
      originalSessionStorage = globalThis.sessionStorage;
    });

    afterEach(() => {
      Object.defineProperty(globalThis, 'sessionStorage', {
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
      Object.defineProperty(globalThis, 'sessionStorage', {
        value: sessionStorageMock,
        writable: true
      });

      const store = new AttributesStore({} as any, {} as any);
      expect(store.sessionId).toBe('session-123');
    });

    it('should set session id in sessionStorage when setSessionId is called', () => {
      const storage: Record<string, string> = {};
      const sessionStorageMock = {
        getItem: (key: string) => storage[key] || null,
        setItem: (key: string, val: string) => {
          storage[key] = val;
        }
      };
      Object.defineProperty(globalThis, 'sessionStorage', {
        value: sessionStorageMock,
        writable: true
      });

      const store = new AttributesStore({} as any, {} as any);
      expect(store.sessionId).toBeUndefined();

      store.setSessionId('new-session');
      expect(store.sessionId).toBe('new-session');
      expect(storage['firebasecrashlytics.sessionid']).toBe('new-session');
    });

    it('should handle sessionStorage throwing errors on getItem gracefully', () => {
      const sessionStorageMock = {
        getItem: () => {
          throw new Error('sessionStorage access blocked');
        },
        setItem: () => {}
      };
      Object.defineProperty(globalThis, 'sessionStorage', {
        value: sessionStorageMock,
        writable: true
      });

      // Should not throw
      const store = new AttributesStore({} as any, {} as any);
      expect(store.sessionId).toBeUndefined();
    });

    it('should handle sessionStorage throwing errors on setItem gracefully', () => {
      const sessionStorageMock = {
        getItem: () => null,
        setItem: () => {
          throw new Error('sessionStorage quota exceeded');
        }
      };
      Object.defineProperty(globalThis, 'sessionStorage', {
        value: sessionStorageMock,
        writable: true
      });

      const store = new AttributesStore({} as any, {} as any);
      // Should not throw
      store.setSessionId('new-session');
      expect(store.sessionId).toBe('new-session');
    });

    it('should handle undefined sessionStorage gracefully', () => {
      Object.defineProperty(globalThis, 'sessionStorage', {
        value: undefined,
        writable: true
      });

      const store = new AttributesStore({} as any, {} as any);
      expect(store.sessionId).toBeUndefined();

      // Should not throw
      store.setSessionId('new-session');
      expect(store.sessionId).toBe('new-session');
    });
  });

  describe('updateOptions', () => {
    let originalAutoConstantsVersion: any;

    beforeEach(() => {
      originalAutoConstantsVersion = AUTO_CONSTANTS.appVersion;
    });

    afterEach(() => {
      AUTO_CONSTANTS.appVersion = originalAutoConstantsVersion;
    });

    it('should use appVersion from options if provided', () => {
      const store = new AttributesStore({} as any, { appVersion: '1.2.3' });
      expect(store.getLogAttributes()).toHaveProperty('app.build_id', '1.2.3');
    });

    it('should fall back to AUTO_CONSTANTS appVersion if not in options', () => {
      AUTO_CONSTANTS.appVersion = '2.3.4';
      const store = new AttributesStore({} as any, {});
      expect(store.getLogAttributes()).toHaveProperty('app.build_id', '2.3.4');
    });

    it('should use "unset" if neither options nor AUTO_CONSTANTS appVersion are set', () => {
      AUTO_CONSTANTS.appVersion = undefined;
      const store = new AttributesStore({} as any, {});
      expect(store.getLogAttributes()).toHaveProperty('app.build_id', 'unset');
    });

    it('should update appVersion when updateOptions is called', () => {
      const store = new AttributesStore({} as any, { appVersion: '1.2.3' });
      expect(store.getLogAttributes()).toHaveProperty('app.build_id', '1.2.3');

      store.updateOptions({ appVersion: '3.4.5' });
      expect(store.getLogAttributes()).toHaveProperty('app.build_id', '3.4.5');
    });

    it('should include customAttributes in log attributes if provided', () => {
      const store = new AttributesStore({} as any, {
        customAttributes: { key1: 'value1', key2: 'value2' }
      });
      expect(store.getLogAttributes()).toMatchObject({
        key1: 'value1',
        key2: 'value2'
      });
    });

    it('should update customAttributes when updateOptions is called', () => {
      const store = new AttributesStore({} as any, {
        customAttributes: { key1: 'value1' }
      });
      expect(store.getLogAttributes()).toMatchObject({
        key1: 'value1'
      });

      store.updateOptions({
        customAttributes: { key1: 'value2', key3: 'value3' }
      });
      const logAttrs = store.getLogAttributes();
      expect(logAttrs).toMatchObject({
        key1: 'value2',
        key3: 'value3'
      });
    });
  });

  describe('getLogAttributes', () => {
    it('should return session id, app version, route path, and custom attributes', () => {
      const store = new AttributesStore(
        { projectId: 'my-project-123' } as any,
        {
          appVersion: '1.0.0',
          customAttributes: { custom: 'value' }
        }
      );
      store.setSessionId('sess-123');
      store.setRoutePathProvider(() => '/home');

      const logAttributes = store.getLogAttributes();
      expect(logAttributes).toEqual({
        custom: 'value',
        [LOG_ATTR_KEY.APP_VERSION]: '1.0.0',
        [LOG_ATTR_KEY.SESSION_ID]: 'sess-123',
        [LOG_ATTR_KEY.ROUTE_PATH]: '/home'
      });
    });
  });

  describe('getSpanAttributes', () => {
    let originalSessionStorage: Storage | undefined;
    let storage: Record<string, string> = {};

    const MOCK_SESSION_ID = 'mock-session-id';

    beforeEach(() => {
      storage = {};
      originalSessionStorage = globalThis.sessionStorage;
      const sessionStorageMock: Partial<Storage> = {
        getItem: (key: string) => storage[key] || null,
        setItem: (key: string, value: string) => {
          storage[key] = value;
        }
      };
      Object.defineProperty(globalThis, 'sessionStorage', {
        value: sessionStorageMock,
        writable: true
      });
    });

    afterEach(() => {
      Object.defineProperty(globalThis, 'sessionStorage', {
        value: originalSessionStorage,
        writable: true
      });
    });

    it('should add session id to attributes if present in storage', () => {
      storage[SESSION_STORAGE_SESSION_ID_KEY] = MOCK_SESSION_ID;
      const attributesStore = new AttributesStore({ projectId: 'my-project' });
      const attributes = attributesStore.getSpanAttributes();
      expect(attributes[SPAN_ATTR_KEY.SESSION_ID]).toBe(MOCK_SESSION_ID);
    });

    it('should not add session id if not present in storage', () => {
      const attributesStore = new AttributesStore({ projectId: 'my-project' });
      const attributes = attributesStore.getSpanAttributes();
      expect(attributes[SPAN_ATTR_KEY.SESSION_ID]).toBeUndefined();
    });

    it('should add region to resource name if present in options', () => {
      const attributesStore = new AttributesStore(
        { projectId: 'my-project' },
        { region: 'us-central1' }
      );
      const attributes = attributesStore.getSpanAttributes();
      expect(attributes[SPAN_ATTR_KEY.GCP_RESOURCE_NAME]).toBe(
        '//firebasetelemetry.googleapis.com/projects/my-project/locations/us-central1/'
      );
    });

    it('should use default region in resource name if not present in options', () => {
      const attributesStore = new AttributesStore({ projectId: 'my-project' });
      const attributes = attributesStore.getSpanAttributes();
      expect(attributes[SPAN_ATTR_KEY.GCP_RESOURCE_NAME]).toBe(
        '//firebasetelemetry.googleapis.com/projects/my-project/locations/global/'
      );
    });

    it('should add active app screen id to attributes if available', () => {
      const attributesStore = new AttributesStore({ projectId: 'my-project' });
      attributesStore.setRoutePathProvider(() => 'mock-screen-id');
      const attributes = attributesStore.getSpanAttributes();
      expect(attributes[SPAN_ATTR_KEY.APP_SCREEN_ID]).toBe('mock-screen-id');
    });

    it('should not add active app screen id to attributes if not available', () => {
      const attributesStore = new AttributesStore({ projectId: 'my-project' });
      const attributes = attributesStore.getSpanAttributes();
      expect(attributes[SPAN_ATTR_KEY.APP_SCREEN_ID]).toBeUndefined();
    });

    it('should set app version attribute to the configured app version', () => {
      const attributesStore = new AttributesStore(
        { projectId: 'my-project' },
        { appVersion: '1.2.3' }
      );
      const attributes = attributesStore.getSpanAttributes();
      expect(attributes[SPAN_ATTR_KEY.SERVICE_VERSION]).toBe('1.2.3');
    });

    it("should set app version attribute to 'unset' if configured app version not available", () => {
      const attributesStore = new AttributesStore(
        { projectId: 'my-project' },
        {}
      );
      const attributes = attributesStore.getSpanAttributes();
      expect(attributes[SPAN_ATTR_KEY.SERVICE_VERSION]).toBe('unset');
    });
  });
});
