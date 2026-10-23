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
  FirebaseApp,
  _addComponent,
  _getProvider,
  deleteApp,
  getApps,
  initializeApp
} from '@firebase/app';
import {
  Component,
  ComponentType,
  InstantiationMode,
  Name,
  Provider
} from '@firebase/component';
import { expect, vi, describe, beforeEach, afterEach, it } from 'vitest';

import { logger } from '../../logger';

import { AbstractTokenProvider, TokenOptions } from './AbstractTokenProvider';

interface TestToken {
  token: string;
}

interface TestComponent {
  getToken: (forceRefresh?: boolean) => Promise<TestToken | null>;
  addListener: (listener: (token: string) => void) => void;
  removeListener: (listener: (token: string) => void) => void;
}

type TestListener = (token: string) => void;

/** Interface that exposes private fields of AbstractTokenProvider for testing purposes. */
interface AbstractTokenProviderWithInternals {
  onInitUnsubscribe?: (() => void) | undefined;
  activeGetTokenPromise?: Promise<TestToken | null> | undefined;
  activeForceRefreshPromise?: Promise<TestToken | null> | undefined;
  resolveActiveGetTokenPromise?:
    ((token: TestToken | null) => void) | undefined;
  activeListeners: TestListener[];
  queuedListeners: TestListener[];
}

/** Interface that exposes private fields of Provider for testing purposes. */
interface ProviderWithInternals {
  onInitCallbacks: Map<string, Set<unknown>>;
}

class ConcreteTestTokenProvider extends AbstractTokenProvider<
  TestToken,
  TestComponent,
  TestListener,
  Name
> {
  private get internals(): AbstractTokenProviderWithInternals {
    return this as unknown as AbstractTokenProviderWithInternals;
  }

  getComponent(): TestComponent | undefined {
    return this.component;
  }

  getOnInitUnsubscribe(): (() => void) | undefined {
    return this.internals.onInitUnsubscribe;
  }

  getActiveGetTokenPromise(): Promise<TestToken | null> | undefined {
    return this.internals.activeGetTokenPromise;
  }

  getActiveForceRefreshPromise(): Promise<TestToken | null> | undefined {
    return this.internals.activeForceRefreshPromise;
  }

  getResolveActiveGetTokenPromise():
    ((token: TestToken | null) => void) | undefined {
    return this.internals.resolveActiveGetTokenPromise;
  }

  getActiveListeners(): TestListener[] {
    return this.internals.activeListeners;
  }

  getQueuedListeners(): TestListener[] {
    return this.internals.queuedListeners;
  }

  protected convertServerAppToken(token: string): TestToken {
    return { token: `converted:${token}` };
  }

  protected fetchToken(
    component: TestComponent,
    options: TokenOptions = { forceRefresh: false }
  ): Promise<TestToken | null> {
    return component.getToken(options.forceRefresh);
  }

  protected addListener(
    component: TestComponent,
    listener: TestListener
  ): void {
    component.addListener(listener);
  }

  protected removeListener(
    component: TestComponent,
    listener: TestListener
  ): void {
    component.removeListener(listener);
  }
}

function registerMockComponent<T extends object>(
  app: FirebaseApp,
  name: string,
  instance?: T,
  options?: { explicit?: boolean }
): Provider<Name> {
  if (instance) {
    _addComponent(
      app,
      new Component(
        name as Name,
        () => instance as never,
        ComponentType.PRIVATE
      ).setInstantiationMode(
        options?.explicit ? InstantiationMode.EXPLICIT : InstantiationMode.EAGER
      )
    );
  }
  return _getProvider(app, name as Name);
}

describe('AbstractTokenProvider', () => {
  let browserApp: FirebaseApp;

  beforeEach(() => {
    browserApp = initializeApp({ projectId: 'test-project' });
  });

  afterEach(async () => {
    await Promise.all(getApps().map(existingApp => deleteApp(existingApp)));
  });

  describe('initialization', () => {
    it('unsubscribes onInit callback once component initializes', () => {
      const mockComponent: TestComponent = {
        getToken: vi.fn().mockResolvedValue({ token: 'token' }),
        addListener: vi.fn(),
        removeListener: vi.fn()
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent,
        { explicit: true }
      );
      const tokenProvider = new ConcreteTestTokenProvider(rawProvider);
      const callbacks = (
        rawProvider as unknown as ProviderWithInternals
      ).onInitCallbacks.get('[DEFAULT]');

      expect(tokenProvider.getComponent()).toBeUndefined();
      expect(tokenProvider.getOnInitUnsubscribe()).toBeTypeOf('function');
      expect(callbacks?.size).toBe(1);

      rawProvider.initialize();

      expect(tokenProvider.getComponent()).toBe(mockComponent);
      expect(tokenProvider.getOnInitUnsubscribe()).toBeUndefined();
      expect(callbacks?.size).toBe(0);
    });

    it('unsubscribes onInit callback and clears queuedListeners when terminate() is called prior to initialization', () => {
      const mockComponent: TestComponent = {
        getToken: vi.fn().mockResolvedValue({ token: 'token' }),
        addListener: vi.fn(),
        removeListener: vi.fn()
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent,
        { explicit: true }
      );
      const tokenProvider = new ConcreteTestTokenProvider(rawProvider);
      const listener: TestListener = vi.fn();
      tokenProvider.addTokenChangeListener(listener);

      const callbacks = (
        rawProvider as unknown as ProviderWithInternals
      ).onInitCallbacks.get('[DEFAULT]');

      expect(tokenProvider.getComponent()).toBeUndefined();
      expect(tokenProvider.getOnInitUnsubscribe()).toBeTypeOf('function');
      expect(tokenProvider.getQueuedListeners()).toEqual([listener]);
      expect(callbacks?.size).toBe(1);

      tokenProvider.terminate();

      expect(tokenProvider.getComponent()).toBeUndefined();
      expect(tokenProvider.getOnInitUnsubscribe()).toBeUndefined();
      expect(tokenProvider.getQueuedListeners()).toEqual([]);
      expect(callbacks?.size).toBe(0);

      rawProvider.initialize();
      expect(tokenProvider.getComponent()).toBeUndefined();
      expect(mockComponent.addListener).not.toHaveBeenCalled();
    });
  });

  describe('getToken', () => {
    it('returns null when provider is omitted or uninitialized', async () => {
      const omittedProvider = new ConcreteTestTokenProvider(undefined);
      await expect(omittedProvider.getToken()).resolves.toBeNull();

      const rawProvider = registerMockComponent(browserApp, 'test-service');
      const uninitializedProvider = new ConcreteTestTokenProvider(rawProvider);
      await expect(uninitializedProvider.getToken()).resolves.toBeNull();
    });

    it('retrieves token immediately when component is initialized', async () => {
      const mockComponent: TestComponent = {
        getToken: vi.fn().mockResolvedValue({ token: 'initial-token' }),
        addListener: vi.fn(),
        removeListener: vi.fn()
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent
      );
      const tokenProvider = new ConcreteTestTokenProvider(rawProvider);

      const token = await tokenProvider.getToken();
      expect(token).toEqual({ token: 'initial-token' });
      expect(mockComponent.getToken).toHaveBeenCalledWith(false);
    });

    it('waits to resolve token when component initializes after provider creation', async () => {
      const mockComponent: TestComponent = {
        getToken: vi.fn().mockResolvedValue({ token: 'delayed-token' }),
        addListener: vi.fn(),
        removeListener: vi.fn()
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent,
        { explicit: true }
      );
      const tokenProvider = new ConcreteTestTokenProvider(rawProvider);

      let resolved = false;
      const tokenPromise = tokenProvider.getToken().then(res => {
        resolved = true;
        return res;
      });

      await Promise.resolve();
      expect(resolved).toBe(false);
      expect(tokenProvider.getComponent()).toBeUndefined();

      rawProvider.initialize();

      expect(tokenProvider.getComponent()).toBe(mockComponent);
      await expect(tokenPromise).resolves.toEqual({ token: 'delayed-token' });
      expect(resolved).toBe(true);
    });
  });

  describe('de-duplication of concurrent token requests', () => {
    it('deduplicates concurrent getToken() calls into a single underlying fetch', async () => {
      const firstToken = { token: 'shared-token' };
      const secondToken = { token: 'subsequent-token' };
      let resolveToken!: (val: TestToken) => void;
      const inFlightPromise = new Promise<TestToken>(resolve => {
        resolveToken = resolve;
      });
      const mockComponent: TestComponent = {
        getToken: vi
          .fn()
          .mockReturnValueOnce(inFlightPromise)
          .mockResolvedValue(secondToken),
        addListener: vi.fn(),
        removeListener: vi.fn()
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent
      );
      const tokenProvider = new ConcreteTestTokenProvider(rawProvider);

      expect(tokenProvider.getActiveGetTokenPromise()).toBeUndefined();
      expect(tokenProvider.getResolveActiveGetTokenPromise()).toBeUndefined();

      const getTokenPromises = Array.from({ length: 20 }, () =>
        tokenProvider.getToken()
      );

      expect(tokenProvider.getActiveGetTokenPromise()).toBe(
        getTokenPromises[0]
      );
      expect(tokenProvider.getResolveActiveGetTokenPromise()).toBeTypeOf(
        'function'
      );
      expect(tokenProvider.getActiveForceRefreshPromise()).toBeUndefined();
      expect(mockComponent.getToken).toHaveBeenCalledOnce();
      expect(mockComponent.getToken).toHaveBeenCalledWith(false);

      for (let i = 0; i < 20; i++) {
        expect(getTokenPromises[i]).toBe(getTokenPromises[0]);
      }

      resolveToken(firstToken);
      const resolveTokens = await Promise.all(getTokenPromises);
      for (const token of resolveTokens) {
        expect(token).toEqual(firstToken);
      }

      expect(tokenProvider.getActiveGetTokenPromise()).toBeUndefined();
      expect(tokenProvider.getResolveActiveGetTokenPromise()).toBeUndefined();

      const finalToken = await tokenProvider.getToken();
      expect(finalToken).toEqual(secondToken);
      expect(mockComponent.getToken).toHaveBeenCalledTimes(2);
    });

    it('deduplicates concurrent getToken({ forceRefresh: true }) calls', async () => {
      const firstToken = { token: 'forced-token' };
      const secondToken = { token: 'subsequent-forced-token' };
      let resolveToken!: (val: TestToken) => void;
      const inFlightPromise = new Promise<TestToken>(resolve => {
        resolveToken = resolve;
      });
      const mockComponent: TestComponent = {
        getToken: vi
          .fn()
          .mockReturnValueOnce(inFlightPromise)
          .mockResolvedValue(secondToken),
        addListener: vi.fn(),
        removeListener: vi.fn()
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent
      );
      const tokenProvider = new ConcreteTestTokenProvider(rawProvider);

      expect(tokenProvider.getActiveForceRefreshPromise()).toBeUndefined();

      const getTokenPromises = Array.from({ length: 20 }, () =>
        tokenProvider.getToken({ forceRefresh: true })
      );

      expect(tokenProvider.getActiveForceRefreshPromise()).toBe(
        getTokenPromises[0]
      );
      expect(tokenProvider.getActiveGetTokenPromise()).toBeUndefined();
      expect(tokenProvider.getResolveActiveGetTokenPromise()).toBeUndefined();
      expect(mockComponent.getToken).toHaveBeenCalledOnce();
      expect(mockComponent.getToken).toHaveBeenCalledWith(true);

      for (let i = 0; i < 20; i++) {
        expect(getTokenPromises[i]).toBe(getTokenPromises[0]);
      }

      resolveToken(firstToken);
      const resolveTokens = await Promise.all(getTokenPromises);
      for (const token of resolveTokens) {
        expect(token).toEqual(firstToken);
      }

      expect(tokenProvider.getActiveForceRefreshPromise()).toBeUndefined();

      const finalToken = await tokenProvider.getToken({
        forceRefresh: true
      });
      expect(finalToken).toEqual(secondToken);
      expect(mockComponent.getToken).toHaveBeenCalledTimes(2);
    });

    it('piggybacks concurrent unforced getToken({ forceRefresh: false }) calls onto an in-flight forceRefresh', async () => {
      const firstToken = { token: 'piggyback-token' };
      let resolveToken!: (val: TestToken) => void;
      const inFlightPromise = new Promise<TestToken>(resolve => {
        resolveToken = resolve;
      });
      const mockComponent: TestComponent = {
        getToken: vi.fn().mockReturnValue(inFlightPromise),
        addListener: vi.fn(),
        removeListener: vi.fn()
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent
      );
      const tokenProvider = new ConcreteTestTokenProvider(rawProvider);

      const forceRefreshPromise = tokenProvider.getToken({
        forceRefresh: true
      });
      const unforcedPromises = Array.from({ length: 10 }, () =>
        tokenProvider.getToken({ forceRefresh: false })
      );

      expect(tokenProvider.getActiveForceRefreshPromise()).toBe(
        forceRefreshPromise
      );
      expect(tokenProvider.getActiveGetTokenPromise()).toBeUndefined();
      expect(tokenProvider.getResolveActiveGetTokenPromise()).toBeUndefined();
      expect(mockComponent.getToken).toHaveBeenCalledOnce();
      expect(mockComponent.getToken).toHaveBeenCalledWith(true);

      for (let i = 0; i < 10; i++) {
        expect(unforcedPromises[i]).toBe(forceRefreshPromise);
      }

      resolveToken(firstToken);
      const [forcedResult, ...unforcedResults] = await Promise.all([
        forceRefreshPromise,
        ...unforcedPromises
      ]);
      expect(forcedResult).toEqual(firstToken);
      for (const token of unforcedResults) {
        expect(token).toEqual(firstToken);
      }

      expect(tokenProvider.getActiveForceRefreshPromise()).toBeUndefined();
      expect(tokenProvider.getActiveGetTokenPromise()).toBeUndefined();
    });

    it('resolves in-flight unforced getToken(false) when a subsequent forceRefresh settles first', async () => {
      const staleToken = { token: 'stale-token' };
      const forcedToken = { token: 'forced-token' };
      const subsequentToken = { token: 'subsequent-token' };
      let resolveUnforced!: (val: TestToken) => void;
      let resolveForced!: (val: TestToken) => void;

      const returnedUnforcedPromise = new Promise<TestToken>(resolve => {
        resolveUnforced = resolve;
      });
      const returnedForcedpromise = new Promise<TestToken>(resolve => {
        resolveForced = resolve;
      });

      const mockComponent: TestComponent = {
        getToken: vi
          .fn()
          .mockReturnValueOnce(returnedUnforcedPromise)
          .mockReturnValueOnce(returnedForcedpromise)
          .mockResolvedValue(subsequentToken),
        addListener: vi.fn(),
        removeListener: vi.fn()
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent
      );
      const tokenProvider = new ConcreteTestTokenProvider(rawProvider);

      const unforcedPromise = tokenProvider.getToken({ forceRefresh: false });
      expect(tokenProvider.getActiveGetTokenPromise()).toBe(unforcedPromise);
      expect(tokenProvider.getResolveActiveGetTokenPromise()).toBeTypeOf(
        'function'
      );
      expect(tokenProvider.getActiveForceRefreshPromise()).toBeUndefined();
      expect(mockComponent.getToken).toHaveBeenCalledOnce();
      expect(mockComponent.getToken).toHaveBeenCalledWith(false);

      const forcedPromise = tokenProvider.getToken({ forceRefresh: true });
      expect(tokenProvider.getActiveGetTokenPromise()).toBe(unforcedPromise);
      expect(tokenProvider.getActiveForceRefreshPromise()).toBe(forcedPromise);
      expect(mockComponent.getToken).toHaveBeenCalledTimes(2);
      expect(mockComponent.getToken).toHaveBeenLastCalledWith(true);

      resolveForced(forcedToken);
      const [forcedResult, unforcedResult] = await Promise.all([
        forcedPromise,
        unforcedPromise
      ]);

      expect(forcedResult).toEqual(forcedToken);
      expect(unforcedResult).toEqual(forcedToken);
      expect(tokenProvider.getActiveGetTokenPromise()).toBeUndefined();
      expect(tokenProvider.getResolveActiveGetTokenPromise()).toBeUndefined();
      expect(tokenProvider.getActiveForceRefreshPromise()).toBeUndefined();

      const subsequentCall = await tokenProvider.getToken({
        forceRefresh: false
      });
      expect(subsequentCall).toEqual(subsequentToken);
      expect(mockComponent.getToken).toHaveBeenCalledTimes(3);

      resolveUnforced(staleToken);
      const staleUnforcedResult = await unforcedPromise;
      expect(staleUnforcedResult).toEqual(forcedToken);
    });

    it('resets active in-flight request when unforced getToken() rejects', async () => {
      let rejectFirst!: (err: Error) => void;
      const firstPromise = new Promise<TestToken>((_, reject) => {
        rejectFirst = reject;
      });
      const secondToken = { token: 'retry-token' };
      const mockComponent: TestComponent = {
        getToken: vi
          .fn()
          .mockReturnValueOnce(firstPromise)
          .mockResolvedValue(secondToken),
        addListener: vi.fn(),
        removeListener: vi.fn()
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent
      );
      const tokenProvider = new ConcreteTestTokenProvider(rawProvider);

      const call1 = tokenProvider.getToken();
      const call2 = tokenProvider.getToken();
      expect(call1).toBe(call2);
      expect(tokenProvider.getActiveGetTokenPromise()).toBe(call1);
      expect(tokenProvider.getResolveActiveGetTokenPromise()).toBeTypeOf(
        'function'
      );

      rejectFirst(new Error('network-failure'));

      await expect(call1).rejects.toThrow('network-failure');
      await expect(call2).rejects.toThrow('network-failure');
      expect(tokenProvider.getActiveGetTokenPromise()).toBeUndefined();
      expect(tokenProvider.getResolveActiveGetTokenPromise()).toBeUndefined();

      const subsequentCall = await tokenProvider.getToken();
      expect(subsequentCall).toEqual(secondToken);
      expect(mockComponent.getToken).toHaveBeenCalledTimes(2);
    });

    it('resets active in-flight request when forced getToken({ forceRefresh: true }) rejects', async () => {
      let rejectForced!: (err: Error) => void;
      const forcedPromise = new Promise<TestToken>((_, reject) => {
        rejectForced = reject;
      });
      const subsequentToken = { token: 'retry-forced-token' };
      const mockComponent: TestComponent = {
        getToken: vi
          .fn()
          .mockReturnValueOnce(forcedPromise)
          .mockResolvedValue(subsequentToken),
        addListener: vi.fn(),
        removeListener: vi.fn()
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent
      );
      const tokenProvider = new ConcreteTestTokenProvider(rawProvider);

      const call1 = tokenProvider.getToken({ forceRefresh: true });
      const call2 = tokenProvider.getToken({ forceRefresh: true });
      expect(call1).toBe(call2);
      expect(tokenProvider.getActiveForceRefreshPromise()).toBe(call1);

      rejectForced(new Error('force-refresh-failure'));

      await expect(call1).rejects.toThrow('force-refresh-failure');
      await expect(call2).rejects.toThrow('force-refresh-failure');
      expect(tokenProvider.getActiveForceRefreshPromise()).toBeUndefined();

      const subsequentCall = await tokenProvider.getToken({
        forceRefresh: true
      });
      expect(subsequentCall).toEqual(subsequentToken);
      expect(mockComponent.getToken).toHaveBeenCalledTimes(2);
    });
  });

  describe('serverApp static token handling', () => {
    it('resolves static token when component is uninitialized', async () => {
      const rawProvider = registerMockComponent(browserApp, 'test-service');
      const tokenProvider = new ConcreteTestTokenProvider(
        rawProvider,
        'static-jwt'
      );

      const token = await tokenProvider.getToken();
      expect(token).toEqual({ token: 'converted:static-jwt' });
    });

    it('delegates to component when component is initialized, overriding static token', async () => {
      const mockComponent: TestComponent = {
        getToken: vi.fn().mockResolvedValue({ token: 'live-token' }),
        addListener: vi.fn(),
        removeListener: vi.fn()
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent
      );
      const tokenProvider = new ConcreteTestTokenProvider(
        rawProvider,
        'static-jwt'
      );

      const token = await tokenProvider.getToken();
      expect(token).toEqual({ token: 'live-token' });
    });

    it('waits to resolve token when component initializes after provider creation, overriding static token', async () => {
      const mockComponent: TestComponent = {
        getToken: vi.fn().mockResolvedValue({ token: 'delayed-live-token' }),
        addListener: vi.fn(),
        removeListener: vi.fn()
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent,
        { explicit: true }
      );
      const tokenProvider = new ConcreteTestTokenProvider(
        rawProvider,
        'static-jwt'
      );

      let resolved = false;
      const tokenPromise = tokenProvider.getToken().then(res => {
        resolved = true;
        return res;
      });

      await Promise.resolve();
      expect(resolved).toBe(false);

      rawProvider.initialize();

      await expect(tokenPromise).resolves.toEqual({
        token: 'delayed-live-token'
      });
      expect(resolved).toBe(true);
    });

    it('returns null on forceRefresh when falling back to static token', async () => {
      const rawProvider = registerMockComponent(browserApp, 'test-service');
      const tokenProvider = new ConcreteTestTokenProvider(
        rawProvider,
        'static-jwt'
      );

      const token = await tokenProvider.getToken({ forceRefresh: true });
      expect(token).toBeNull();
    });

    it('returns null on forceRefresh when provider is omitted and only static token is provided', async () => {
      const tokenProvider = new ConcreteTestTokenProvider(
        undefined,
        'static-jwt'
      );

      const token = await tokenProvider.getToken({ forceRefresh: true });
      expect(token).toBeNull();
    });

    it('returns null when no static token is provided and component is uninitialized', async () => {
      const rawProvider = registerMockComponent(browserApp, 'test-service');
      const tokenProvider = new ConcreteTestTokenProvider(
        rawProvider,
        undefined
      );

      await expect(tokenProvider.getToken()).resolves.toBeNull();
    });
  });

  describe('listeners', () => {
    it('handles omitted provider without error when managing listeners', () => {
      const omittedProvider = new ConcreteTestTokenProvider(undefined);
      const listener: TestListener = vi.fn();

      expect(omittedProvider.getQueuedListeners()).toEqual([]);

      expect(() => {
        omittedProvider.addTokenChangeListener(listener);
        expect(omittedProvider.getQueuedListeners()).toEqual([listener]);

        omittedProvider.removeTokenChangeListener(listener);
        expect(omittedProvider.getQueuedListeners()).toEqual([]);
      }).not.toThrow();
    });

    it('adds and removes listeners synchronously without queuing when component is already initialized', () => {
      const mockComponent: TestComponent = {
        getToken: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn()
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent
      );
      const tokenProvider = new ConcreteTestTokenProvider(rawProvider);
      const listener: TestListener = vi.fn();

      tokenProvider.addTokenChangeListener(listener);
      expect(tokenProvider.getQueuedListeners()).toEqual([]);
      expect(tokenProvider.getActiveListeners()).toEqual([listener]);
      expect(mockComponent.addListener).toHaveBeenCalledTimes(1);
      expect(mockComponent.addListener).toHaveBeenCalledWith(listener);

      tokenProvider.removeTokenChangeListener(listener);
      expect(tokenProvider.getQueuedListeners()).toEqual([]);
      expect(tokenProvider.getActiveListeners()).toEqual([]);
      expect(mockComponent.removeListener).toHaveBeenCalledTimes(1);
      expect(mockComponent.removeListener).toHaveBeenCalledWith(listener);
    });

    it('adds and removes duplicate listeners when component is already initialized', () => {
      const mockComponent: TestComponent = {
        getToken: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn()
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent
      );
      const tokenProvider = new ConcreteTestTokenProvider(rawProvider);
      const listener: TestListener = vi.fn();

      tokenProvider.addTokenChangeListener(listener);
      tokenProvider.addTokenChangeListener(listener);

      expect(tokenProvider.getQueuedListeners()).toEqual([]);
      expect(tokenProvider.getActiveListeners()).toEqual([listener, listener]);
      expect(mockComponent.addListener).toHaveBeenCalledTimes(2);

      tokenProvider.removeTokenChangeListener(listener);
      expect(tokenProvider.getActiveListeners()).toEqual([listener]);
      expect(mockComponent.removeListener).toHaveBeenCalledTimes(1);

      tokenProvider.removeTokenChangeListener(listener);
      expect(tokenProvider.getActiveListeners()).toEqual([]);
      expect(mockComponent.removeListener).toHaveBeenCalledTimes(2);

      tokenProvider.terminate();
      expect(mockComponent.removeListener).toHaveBeenCalledTimes(2);
    });

    it('removes one duplicate listener in FIFO order per remove call prior to initialization', () => {
      const mockComponent: TestComponent = {
        getToken: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn()
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent,
        { explicit: true }
      );
      const tokenProvider = new ConcreteTestTokenProvider(rawProvider);
      const listener: TestListener = vi.fn();

      tokenProvider.addTokenChangeListener(listener);
      tokenProvider.addTokenChangeListener(listener);
      tokenProvider.addTokenChangeListener(listener);

      expect(tokenProvider.getQueuedListeners()).toEqual([
        listener,
        listener,
        listener
      ]);
      expect(mockComponent.addListener).not.toHaveBeenCalled();

      tokenProvider.removeTokenChangeListener(listener);
      expect(tokenProvider.getQueuedListeners()).toEqual([listener, listener]);
      expect(mockComponent.removeListener).not.toHaveBeenCalled();

      rawProvider.initialize();

      expect(tokenProvider.getQueuedListeners()).toEqual([]);
      expect(tokenProvider.getActiveListeners()).toEqual([listener, listener]);
      expect(mockComponent.addListener).toHaveBeenCalledTimes(2);
      expect(mockComponent.addListener).toHaveBeenNthCalledWith(1, listener);
      expect(mockComponent.addListener).toHaveBeenNthCalledWith(2, listener);
    });

    it('queues listeners in FIFO order and drains the queue upon component initialization', () => {
      const mockComponent: TestComponent = {
        getToken: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn()
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent,
        { explicit: true }
      );
      const tokenProvider = new ConcreteTestTokenProvider(rawProvider);
      const listener1: TestListener = vi.fn();
      const listener2: TestListener = vi.fn();

      expect(tokenProvider.getQueuedListeners()).toEqual([]);

      tokenProvider.addTokenChangeListener(listener1);
      expect(tokenProvider.getQueuedListeners()).toEqual([listener1]);

      tokenProvider.addTokenChangeListener(listener2);
      expect(tokenProvider.getQueuedListeners()).toEqual([
        listener1,
        listener2
      ]);
      expect(mockComponent.addListener).not.toHaveBeenCalled();

      rawProvider.initialize();

      expect(tokenProvider.getQueuedListeners()).toEqual([]);
      expect(tokenProvider.getActiveListeners()).toEqual([
        listener1,
        listener2
      ]);
      expect(mockComponent.addListener).toHaveBeenCalledTimes(2);
      expect(mockComponent.addListener).toHaveBeenNthCalledWith(1, listener1);
      expect(mockComponent.addListener).toHaveBeenNthCalledWith(2, listener2);
    });

    it('removes buffered listener before component initialization so it is never registered', () => {
      const mockComponent: TestComponent = {
        getToken: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn()
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent,
        { explicit: true }
      );
      const tokenProvider = new ConcreteTestTokenProvider(rawProvider);
      const listener1: TestListener = vi.fn();
      const listener2: TestListener = vi.fn();
      const unregisteredListener: TestListener = vi.fn();

      tokenProvider.addTokenChangeListener(listener1);
      tokenProvider.addTokenChangeListener(listener2);
      expect(tokenProvider.getQueuedListeners()).toEqual([
        listener1,
        listener2
      ]);

      tokenProvider.removeTokenChangeListener(unregisteredListener);
      expect(tokenProvider.getQueuedListeners()).toEqual([
        listener1,
        listener2
      ]);

      tokenProvider.removeTokenChangeListener(listener1);
      expect(tokenProvider.getQueuedListeners()).toEqual([listener2]);

      tokenProvider.removeTokenChangeListener(listener2);
      expect(tokenProvider.getQueuedListeners()).toEqual([]);

      rawProvider.initialize();

      expect(tokenProvider.getQueuedListeners()).toEqual([]);
      expect(tokenProvider.getActiveListeners()).toEqual([]);
      expect(mockComponent.addListener).not.toHaveBeenCalled();
      expect(mockComponent.removeListener).not.toHaveBeenCalled();
    });

    it('removes buffered queued listeners if terminate() is called before initialization completes', () => {
      const mockComponent: TestComponent = {
        getToken: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn()
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent,
        { explicit: true }
      );
      const tokenProvider = new ConcreteTestTokenProvider(rawProvider);
      const listener1: TestListener = vi.fn();
      const listener2: TestListener = vi.fn();

      tokenProvider.addTokenChangeListener(listener1);
      tokenProvider.addTokenChangeListener(listener2);
      expect(tokenProvider.getQueuedListeners()).toEqual([
        listener1,
        listener2
      ]);

      tokenProvider.terminate();
      expect(tokenProvider.getQueuedListeners()).toEqual([]);
    });

    it('unregisters all active listeners (both pre-queued and post-init) when terminate() is called', () => {
      const mockComponent: TestComponent = {
        getToken: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn()
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent,
        { explicit: true }
      );
      const tokenProvider = new ConcreteTestTokenProvider(rawProvider);
      const listener1: TestListener = vi.fn();
      const listener2: TestListener = vi.fn();
      const listener3: TestListener = vi.fn();

      tokenProvider.addTokenChangeListener(listener1);
      tokenProvider.addTokenChangeListener(listener2);
      rawProvider.initialize();

      tokenProvider.addTokenChangeListener(listener3);
      expect(tokenProvider.getActiveListeners()).toEqual([
        listener1,
        listener2,
        listener3
      ]);

      tokenProvider.terminate();

      expect(tokenProvider.getActiveListeners()).toEqual([]);
      expect(mockComponent.removeListener).toHaveBeenCalledTimes(3);
      expect(mockComponent.removeListener).toHaveBeenNthCalledWith(
        1,
        listener1
      );
      expect(mockComponent.removeListener).toHaveBeenNthCalledWith(
        2,
        listener2
      );
      expect(mockComponent.removeListener).toHaveBeenNthCalledWith(
        3,
        listener3
      );
    });

    it('catches and logs errors thrown by addListener or removeListener on initialized component', () => {
      const errors: string[] = [];
      vi.spyOn(logger, 'error').mockImplementation((...args: unknown[]) =>
        errors.push(args.join(' '))
      );
      const mockComponent: TestComponent = {
        getToken: vi.fn(),
        addListener: vi.fn().mockImplementation(() => {
          throw new Error('add-failed');
        }),
        removeListener: vi.fn().mockImplementation(() => {
          throw new Error('remove-failed');
        })
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent
      );
      const tokenProvider = new ConcreteTestTokenProvider(rawProvider);
      const listener: TestListener = vi.fn();

      expect(() => {
        tokenProvider.addTokenChangeListener(listener);
      }).not.toThrow();
      expect(tokenProvider.getActiveListeners()).toEqual([]);

      expect(() => {
        tokenProvider.removeTokenChangeListener(listener);
      }).not.toThrow();

      expect(tokenProvider.getQueuedListeners()).toEqual([]);
      expect(tokenProvider.getActiveListeners()).toEqual([]);
      expect(errors).toHaveLength(2);
      expect(errors[0]).toContain('add-failed');
      expect(errors[1]).toContain('remove-failed');
    });

    it('catches and logs errors thrown when registering buffered listeners upon initialization and continues draining the queue', () => {
      const errors: string[] = [];
      vi.spyOn(logger, 'error').mockImplementation((...args: unknown[]) =>
        errors.push(args.join(' '))
      );
      const mockComponent: TestComponent = {
        getToken: vi.fn(),
        addListener: vi
          .fn()
          .mockImplementationOnce(() => {
            throw new Error('init-add-failed');
          })
          .mockImplementationOnce(() => { }),
        removeListener: vi.fn()
      };
      const rawProvider = registerMockComponent(
        browserApp,
        'test-service',
        mockComponent,
        { explicit: true }
      );
      const tokenProvider = new ConcreteTestTokenProvider(rawProvider);
      const listener1: TestListener = vi.fn();
      const listener2: TestListener = vi.fn();

      tokenProvider.addTokenChangeListener(listener1);
      tokenProvider.addTokenChangeListener(listener2);
      expect(tokenProvider.getQueuedListeners()).toEqual([
        listener1,
        listener2
      ]);

      expect(() => rawProvider.initialize()).not.toThrow();

      expect(tokenProvider.getQueuedListeners()).toEqual([]);
      expect(tokenProvider.getActiveListeners()).toEqual([listener2]);
      expect(mockComponent.addListener).toHaveBeenCalledTimes(2);
      expect(mockComponent.addListener).toHaveBeenNthCalledWith(1, listener1);
      expect(mockComponent.addListener).toHaveBeenNthCalledWith(2, listener2);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('init-add-failed');
    });
  });
});
