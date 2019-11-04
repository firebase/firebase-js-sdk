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
import { DEFAULT_ENTRY_NAME } from './constants';
import { InstantiationMode } from './types';
import { Component } from './component';

/**
 * Provider for instance of type T, e.g. Auth, RC
 */
export class Provider<T = unknown> {
  private component: Component<T> | null = null;
  private readonly instances: Map<string, T> = new Map();
  private readonly instancesDeferred: Map<string, Deferred<T>> = new Map();

  constructor(private readonly name: string, private readonly container: ComponentContainer) {}

  get(identifier: string = DEFAULT_ENTRY_NAME): Promise<T> {
    // if multipleInstances is not supported, use the default name
    const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);

    if (!this.instancesDeferred.has(normalizedIdentifier)) {
      const deferred = new Deferred<T>();
      this.instancesDeferred.set(normalizedIdentifier, deferred);
      // If the service instance is available, resolve the promise with it immediately
      const instance = this.getOrInitializeService(normalizedIdentifier);
      if (instance) {
        deferred.resolve(instance);
      }
    }

    return this.instancesDeferred.get(normalizedIdentifier)!.promise;
  }

  getImmediate(
    identifier: string | undefined,
    options: { optional: true }
  ): T | null;
  getImmediate(identifier?: string, options?: { optional: false }): T;
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

  setComponent(component: Component<T>): void {
    if (component.name !== this.name) {
      throw Error(
        `Mismatching Component ${component.name} for Provider ${this.name}.`
      );
    }

    if (this.component) {
      throw Error(`Component for ${this.name} has already been provided`);
    }

    this.component = component;
    // if the service is eager, initialize the default instance
    if (isComponentEager(component)) {
      this.getOrInitializeService(DEFAULT_ENTRY_NAME);
    }

    // Create service instances for the pending promises and resolve them
    // NOTE: if this.multipleInstances is false, only the default instance will be created
    // and all promises with resolve with it regardless of the identifier.
    for (const [
      instanceIdentifier,
      instanceDeferred
    ] of this.instancesDeferred.entries()) {
      const normalizedIdentifier = this.normalizeInstanceIdentifier(
        instanceIdentifier
      );

      // `getOrInitializeService()` should always return a valid instance since a component is guaranteed. use ! to make typescript happy.
      const instance = this.getOrInitializeService(normalizedIdentifier)!;

      instanceDeferred.resolve(instance);
    }
  }

  clearInstance(identifier: string = DEFAULT_ENTRY_NAME): void {
    this.instancesDeferred.delete(identifier);
    this.instances.delete(identifier);
  }

  // app.delete() will call this method on every provider to delete the services
  // TODO: should we mark the provider as deleted?
  async delete(): Promise<void> {
    const services = Array.from(this.instances.values());

    await Promise.all(
      services
        .filter(service => 'INTERNAL' in service)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map(service => (service as any).INTERNAL!.delete())
    );
  }

  isComponentSet(): boolean {
    return this.component != null;
  }

  private getOrInitializeService(identifier: string): T | null {
    let instance = this.instances.get(identifier);
    if (!instance && this.component) {
      instance = this.component.instanceFactory(
        this.container,
        normalizeIdentifierForFactory(identifier)
      );
      this.instances.set(identifier, instance);
    }

    return instance || null;
  }

  private normalizeInstanceIdentifier(identifier: string): string {
    if (this.component) {
      return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME;
    } else {
      return identifier; // assume multiple instances are supported before the component is provided.
    }
  }
}

// undefined should be passed to the service factory for the default instance
function normalizeIdentifierForFactory(identifier: string): string | undefined {
  return identifier === DEFAULT_ENTRY_NAME ? undefined : identifier;
}

function isComponentEager(component: Component): boolean {
  return component.instantiationMode === InstantiationMode.EAGER;
}
