/**
 * @license
 * Copyright 2019 Google Inc.
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

import { Deferred } from '@firebase/util';
import { ComponentContainer } from './component_container';
import { DEFAULT_ENTRY_NAME } from './contants';
import { ServiceFactory } from './types';

/**
 * Provider for interface of type T, e.g. Auth, RC
 */
export class Provider<T = unknown> {
  private factory: ServiceFactory<T> | null = null;
  private multipleInstances: boolean = true; // we assume multiple instances are supported by default
  private serviceInstances: Map<string, T> = new Map();
  private serviceInstancesDeferred: Map<string, Deferred<T>> = new Map();

  constructor(
    private name: string,
    private container: ComponentContainer
  ) {}

  get(identifier: string = DEFAULT_ENTRY_NAME): Promise<T> {
    // if multipleInstances is not supported, use the default name
    const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);

    if (!this.serviceInstancesDeferred.has(normalizedIdentifier)) {
      const deferred = new Deferred<T>();
      this.serviceInstancesDeferred.set(normalizedIdentifier, deferred);
      // If the service instance is available, resolve the promise with it immediately
      const instance = this.getOrInitializeService(normalizedIdentifier);
      if (instance) {
        deferred.resolve(instance);
      }
    }

    return this.serviceInstancesDeferred.get(normalizedIdentifier)!.promise;
  }

  getImmediate(
    identifier: string = DEFAULT_ENTRY_NAME,
    options?: { optional: boolean }
  ): T | null {
    // if multipleInstances is not supported, use the default name
    const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);

    const instance = this.getOrInitializeService(normalizedIdentifier);

    if (!instance) {
      if (options && options.optional) {
        return null;
      }
      throw Error(`Service ${this.name} is not available`);
    }

    return instance;
  }

  provideFactory(
    factory: ServiceFactory<T>,
    multipleInstances: boolean = false,
    eager: boolean = false
  ): void {
    if (this.factory) {
      throw Error(`Service factory for ${this.name} has already been provided`);
    }

    this.factory = factory;
    this.multipleInstances = multipleInstances;

    // if the service is eager, initialize the default instance
    if (eager) {
      this.getOrInitializeService(DEFAULT_ENTRY_NAME);
    }

    // Create service instances for the pending promises and resolve them
    // NOTE: if this.multipleInstances is false, only the default instance will be created
    // and all promises with resolve with it regardless of the identifier.
    for (const [
      instanceIdentifier,
      instanceDeferred
    ] of this.serviceInstancesDeferred.entries()) {
      const normalizedIdentifier = this.normalizeInstanceIdentifier(
        instanceIdentifier
      );
      const instance = this.getOrInitializeService(normalizedIdentifier);

      if (instance) {
        instanceDeferred.resolve(instance);
      }
    }
  }

  clearCache(identifier: string = DEFAULT_ENTRY_NAME): void {
    this.serviceInstancesDeferred.delete(identifier);
    this.serviceInstances.delete(identifier);
  }

  // app.delete() will call this method on every provider to delete the services
  // TODO: should we mark the provider as deleted?
  delete(): Promise<unknown[]> {
    const services = Array.from(this.serviceInstances.values());

    return Promise.all(
      services
        .filter(service => 'INTERNAL' in service)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map(service => (service as any).INTERNAL!.delete())
    );
  }

  private getOrInitializeService(identifier: string): T | null {
    let instance = this.serviceInstances.get(identifier);
    if (!instance && this.factory) {
      instance = this.factory(
        this.container,
        normalizeIdentifierForFactory(identifier)
      );
      this.serviceInstances.set(identifier, instance);
    }

    return instance || null;
  }

  private normalizeInstanceIdentifier(identifier: string): string {
    return this.multipleInstances ? identifier : DEFAULT_ENTRY_NAME;
  }
}

// undefined should be passed to the service factory for the default instance
function normalizeIdentifierForFactory(identifier: string): string | undefined {
  return identifier === DEFAULT_ENTRY_NAME ? undefined : identifier;
}
