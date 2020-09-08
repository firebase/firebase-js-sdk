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

import { Deferred } from '@firebase/util';
import { ComponentContainer } from './component_container';
import { DEFAULT_ENTRY_NAME } from './constants';
import { InstantiationMode, Name, NameServiceMapping } from './types';
import { Component } from './component';

/**
 * Provider for instance for service name T, e.g. 'auth', 'auth-internal'
 * NameServiceMapping[T] is an alias for the type of the instance
 */
export class Provider<T extends Name> {
  private component: Component<T> | null = null;
  private readonly instances: Map<string, NameServiceMapping[T]> = new Map();
  private readonly instancesDeferred: Map<
    string,
    Deferred<NameServiceMapping[T]>
  > = new Map();

  constructor(
    private readonly name: T,
    private readonly container: ComponentContainer
  ) {}

  /**
   * @param identifier A provider can provide mulitple instances of a service
   * if this.component.multipleInstances is true.
   */
  get(identifier: string = DEFAULT_ENTRY_NAME): Promise<NameServiceMapping[T]> {
    // if multipleInstances is not supported, use the default name
    const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);

    if (!this.instancesDeferred.has(normalizedIdentifier)) {
      const deferred = new Deferred<NameServiceMapping[T]>();
      this.instancesDeferred.set(normalizedIdentifier, deferred);
      // If the service instance is available, resolve the promise with it immediately
      try {
        const instance = this.getOrInitializeService(normalizedIdentifier);
        if (instance) {
          deferred.resolve(instance);
        }
      } catch (e) {
        // when the instance factory throws an exception during get(), it should not cause
        // a fatal error. We just return the unresolved promise in this case.
      }
    }

    return this.instancesDeferred.get(normalizedIdentifier)!.promise;
  }

  /**
   *
   * @param options.identifier A provider can provide mulitple instances of a service
   * if this.component.multipleInstances is true.
   * @param options.optional If optional is false or not provided, the method throws an error when
   * the service is not immediately available.
   * If optional is true, the method returns null if the service is not immediately available.
   */
  getImmediate(options: {
    identifier?: string;
    optional: true;
  }): NameServiceMapping[T] | null;
  getImmediate(options?: {
    identifier?: string;
    optional?: false;
  }): NameServiceMapping[T];
  getImmediate(options?: {
    identifier?: string;
    optional?: boolean;
  }): NameServiceMapping[T] | null {
    const { identifier, optional } = {
      identifier: DEFAULT_ENTRY_NAME,
      optional: false,
      ...options
    };
    // if multipleInstances is not supported, use the default name
    const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
    try {
      const instance = this.getOrInitializeService(normalizedIdentifier);

      if (!instance) {
        if (optional) {
          return null;
        }
        throw Error(`Service ${this.name} is not available`);
      }
      return instance;
    } catch (e) {
      if (optional) {
        return null;
      } else {
        throw e;
      }
    }
  }

  getComponent(): Component<T> | null {
    return this.component;
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
      try {
        this.getOrInitializeService(DEFAULT_ENTRY_NAME);
      } catch (e) {
        // when the instance factory for an eager Component throws an exception during the eager
        // initialization, it should not cause a fatal error.
        // TODO: Investigate if we need to make it configurable, because some component may want to cause
        // a fatal error in this case?
      }
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

      try {
        // `getOrInitializeService()` should always return a valid instance since a component is guaranteed. use ! to make typescript happy.
        const instance = this.getOrInitializeService(normalizedIdentifier)!;
        instanceDeferred.resolve(instance);
      } catch (e) {
        // when the instance factory throws an exception, it should not cause
        // a fatal error. We just leave the promise unresolved.
      }
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

    await Promise.all([
      ...services
        .filter(service => 'INTERNAL' in service) // legacy services
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map(service => (service as any).INTERNAL!.delete()),
      ...services
        .filter(service => '_delete' in service) // modularized services
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map(service => (service as any)._delete())
    ]);
  }

  isComponentSet(): boolean {
    return this.component != null;
  }

  private getOrInitializeService(
    identifier: string
  ): NameServiceMapping[T] | null {
    let instance = this.instances.get(identifier);
    if (!instance && this.component) {
      instance = this.component.instanceFactory(
        this.container,
        normalizeIdentifierForFactory(identifier)
      ) as NameServiceMapping[T];
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

function isComponentEager(component: Component<Name>): boolean {
  return component.instantiationMode === InstantiationMode.EAGER;
}
