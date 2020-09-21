/**
 * @license
 * Copyright 2019 Google LLC
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

import { Writable } from 'ts-essentials';

// Add fake SW types.
declare const self: Window & Writable<ServiceWorkerGlobalScope>;

// When trying to stub self.clients self.registration, Sinon complains that these properties do not
// exist. This is because we're not actually running these tests in a service worker context.

// Here we're adding placeholders for Sinon to overwrite, which prevents the "Cannot stub
// non-existent own property" errors.

// Casting to any is needed because TS also thinks that we're in a SW context and considers these
// properties readonly.

// Missing function types are implemented from interfaces, so types are actually defined.
/* eslint-disable @typescript-eslint/explicit-function-return-type */

// const originalSwRegistration = ServiceWorkerRegistration;
export function mockServiceWorker(): void {
  self.clients = new FakeClients();
  self.registration = new FakeServiceWorkerRegistration();
}

export function restoreServiceWorker(): void {
  self.clients = new FakeClients();
  self.registration = new FakeServiceWorkerRegistration();
}

class FakeClients implements Clients {
  private readonly clients: Client[] = [];

  async get(id: string) {
    return this.clients.find(c => id === c.id) ?? null;
  }

  async matchAll({ type = 'all' } = {}) {
    if (type === 'all') {
      return this.clients;
    }
    return this.clients.filter(c => c.type === type);
  }

  async openWindow(url: string) {
    const windowClient = new FakeWindowClient();
    windowClient.url = url;
    this.clients.push(windowClient);
    return windowClient;
  }

  async claim() {}
}

let currentId = 0;
class FakeWindowClient implements WindowClient {
  readonly id: string;
  readonly type = 'window';
  focused = false;
  visibilityState: VisibilityState = 'hidden';
  url = 'https://example.org';

  constructor() {
    this.id = (currentId++).toString();
  }

  async focus() {
    this.focused = true;
    return this;
  }

  async navigate(url: string) {
    this.url = url;
    return this;
  }

  postMessage() {}
}

export class FakeServiceWorkerRegistration
  implements ServiceWorkerRegistration {
  active = null;
  installing = null;
  waiting = null;
  onupdatefound = null;
  pushManager = new FakePushManager();
  scope = '/scope-value';

  // Unused in FCM Web SDK, no need to mock these.
  navigationPreload = (null as unknown) as NavigationPreloadManager;
  sync = (null as unknown) as SyncManager;
  updateViaCache = (null as unknown) as ServiceWorkerUpdateViaCache;

  async getNotifications() {
    return [];
  }

  async showNotification() {}

  async update() {}

  async unregister() {
    return true;
  }

  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return true;
  }
}

class FakePushManager implements PushManager {
  private subscription: FakePushSubscription | null = null;

  async permissionState() {
    return 'granted' as const;
  }

  async getSubscription() {
    return this.subscription;
  }

  async subscribe() {
    if (!this.subscription) {
      this.subscription = new FakePushSubscription();
    }
    return this.subscription!;
  }
}

export class FakePushSubscription implements PushSubscription {
  endpoint = 'https://example.org';
  expirationTime = 1234567890;
  auth = 'auth-value'; // Encoded: 'YXV0aC12YWx1ZQ'
  p256 = 'p256-value'; // Encoded: 'cDI1Ni12YWx1ZQ'

  getKey(name: PushEncryptionKeyName) {
    const encoder = new TextEncoder();
    return encoder.encode(name === 'auth' ? this.auth : this.p256);
  }

  async unsubscribe() {
    return true;
  }

  // Unused in FCM
  toJSON = (null as unknown) as () => PushSubscriptionJSON;
  options = (null as unknown) as PushSubscriptionOptions;
}

/**
 * Most of the fields in here are unused / deprecated. They are only added here to match the TS
 * Event interface.
 */
export class FakeEvent implements ExtendableEvent {
  NONE = Event.NONE;
  AT_TARGET = Event.AT_TARGET;
  BUBBLING_PHASE = Event.BUBBLING_PHASE;
  CAPTURING_PHASE = Event.CAPTURING_PHASE;
  bubbles: boolean;
  cancelable: boolean;
  composed: boolean;
  timeStamp = 123456;
  isTrusted = true;
  eventPhase = Event.NONE;
  target = null;
  currentTarget = null;
  srcElement = null;
  cancelBubble = false;
  defaultPrevented = false;
  returnValue = false;

  preventDefault() {
    this.defaultPrevented = true;
    this.returnValue = true;
  }

  stopPropagation() {}

  stopImmediatePropagation() {}

  initEvent() {}

  waitUntil() {}

  composedPath() {
    return [];
  }

  constructor(public type: string, options: EventInit = {}) {
    this.bubbles = options.bubbles ?? false;
    this.cancelable = options.cancelable ?? false;
    this.composed = options.composed ?? false;
  }
}
