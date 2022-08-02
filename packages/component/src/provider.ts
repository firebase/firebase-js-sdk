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
import {
  InitializeOptions,
  InstantiationMode,
  Name,
  NameServiceMapping,
  OnInitCallBack
} from './types';
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
  private readonly instancesOptions: Map<string, Record<string, unknown>> =
    new Map();
  private onInitCallbacks: Map<string, Set<OnInitCallBack<T>>> = new Map();

  constructor(
    private readonly name: T,
    private readonly container: ComponentContainer
  ) {}

  /**
   * @param identifier A provider can provide mulitple instances of a service
   * if this.component.multipleInstances is true.
   */
  get(identifier?: string): Promise<NameServiceMapping[T]> {
    // if multipleInstances is not supported, use the default name
    const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);

    if (!this.instancesDeferred.has(normalizedIdentifier)) {
      const deferred = new Deferred<NameServiceMapping[T]>();
      this.instancesDeferred.set(normalizedIdentifier, deferred);

      if (
        this.isInitialized(normalizedIdentifier) ||
        this.shouldAutoInitialize()
      ) {
        // initialize the service if it can be auto-initialized
        try {
          const instance = this.getOrInitializeService({
            instanceIdentifier: normalizedIdentifier
          });
          if (instance) {
            deferred.resolve(instance);
          }
        } catch (e) {
          // when the instance factory throws an exception during get(), it should not cause
          // a fatal error. We just return the unresolved promise in this case.
        }
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
    // if multipleInstances is not supported, use the default name
    const normalizedIdentifier = this.normalizeInstanceIdentifier(
      options?.identifier
    );
    const optional = options?.optional ?? false;

    if (
      this.isInitialized(normalizedIdentifier) ||
      this.shouldAutoInitialize()
    ) {
      try {
        return this.getOrInitializeService({
          instanceIdentifier: normalizedIdentifier
        });
      } catch (e) {
        if (optional) {
          return null;
        } else {
          throw e;
        }
      }
    } else {
      // In case a component is not initialized and should/can not be auto-initialized at the moment, return null if the optional flag is set, or throw
      if (optional) {
        return null;
      } else {
        throw Error(`Service ${this.name} is not available`);
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

    // return early without attempting to initialize the component if the component requires explicit initialization (calling `Provider.initialize()`)
    if (!this.shouldAutoInitialize()) {
      return;
    }

    // if the service is eager, initialize the default instance
    if (isComponentEager(component)) {
      try {
        this.getOrInitializeService({ instanceIdentifier: DEFAULT_ENTRY_NAME });
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
      const normalizedIdentifier =
        this.normalizeInstanceIdentifier(instanceIdentifier);

      try {
        // `getOrInitializeService()` should always return a valid instance since a component is guaranteed. use ! to make typescript happy.
        const instance = this.getOrInitializeService({
          instanceIdentifier: normalizedIdentifier
        })!;
        instanceDeferred.resolve(instance);
      } catch (e) {
        // when the instance factory throws an exception, it should not cause
        // a fatal error. We just leave the promise unresolved.
      }
    }
  }

  clearInstance(identifier: string = DEFAULT_ENTRY_NAME): void {
    this.instancesDeferred.delete(identifier);
    this.instancesOptions.delete(identifier);
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

  isInitialized(identifier: string = DEFAULT_ENTRY_NAME): boolean {
    return this.instances.has(identifier);
  }

  getOptions(identifier: string = DEFAULT_ENTRY_NAME): Record<string, unknown> {
    return this.instancesOptions.get(identifier) || {};
  }

  initialize(opts: InitializeOptions = {}): NameServiceMapping[T] {
    const { options = {} } = opts;
    const normalizedIdentifier = this.normalizeInstanceIdentifier(
      opts.instanceIdentifier
    );
    if (this.isInitialized(normalizedIdentifier)) {
      throw Error(
        `${this.name}(${normalizedIdentifier}) has already been initialized`
      );
    }

    if (!this.isComponentSet()) {
      throw Error(`Component ${this.name} has not been registered yet`);
    }

    const instance = this.getOrInitializeService({
      instanceIdentifier: normalizedIdentifier,
      options
    })!;

    // resolve any pending promise waiting for the service instance
    for (const [
      instanceIdentifier,
      instanceDeferred
    ] of this.instancesDeferred.entries()) {
      const normalizedDeferredIdentifier =
        this.normalizeInstanceIdentifier(instanceIdentifier);
      if (normalizedIdentifier === normalizedDeferredIdentifier) {
        instanceDeferred.resolve(instance);
      }
    }

    return instance;
  }

  /**
   *
   * @param callback - a function that will be invoked  after the provider has been initialized by calling provider.initialize().
   * The function is invoked SYNCHRONOUSLY, so it should not execute any longrunning tasks in order to not block the program.
   *
   * @param identifier An optional instance identifier
   * @returns a function to unregister the callback
   */
  onInit(callback: OnInitCallBack<T>, identifier?: string): () => void {
    const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
    const existingCallbacks =
      this.onInitCallbacks.get(normalizedIdentifier) ??
      new Set<OnInitCallBack<T>>();
    existingCallbacks.add(callback);
    this.onInitCallbacks.set(normalizedIdentifier, existingCallbacks);

    const existingInstance = this.instances.get(normalizedIdentifier);
    if (existingInstance) {
      callback(existingInstance, normalizedIdentifier);
    }

    return () => {
      existingCallbacks.delete(callback);
    };
  }

  /**
   * Invoke onInit callbacks synchronously
   * @param instance the service instance`
   */
  private invokeOnInitCallbacks(
    instance: NameServiceMapping[T],
    identifier: string
  ): void {
    const callbacks = this.onInitCallbacks.get(identifier);
    if (!callbacks) {
      return;
    }
    for (const callback of callbacks) {
      try {
        callback(instance, identifier);
      } catch {
        // ignore errors in the onInit callback
      }
    }
  }

  private getOrInitializeService({
    instanceIdentifier,
    options = {}
  }: {
    instanceIdentifier: string;
    options?: Record<string, unknown>;
  }): NameServiceMapping[T] | null {
    let instance = this.instances.get(instanceIdentifier);
    if (!instance && this.component) {
      instance = this.component.instanceFactory(this.container, {
        instanceIdentifier: normalizeIdentifierForFactory(instanceIdentifier),
        options
      });
      this.instances.set(instanceIdentifier, instance);
      this.instancesOptions.set(instanceIdentifier, options);

      /**
       * Invoke onInit listeners.
       * Note this.component.onInstanceCreated is different, which is used by the component creator,
       * while onInit listeners are registered by consumers of the provider.
       */
      this.invokeOnInitCallbacks(instance, instanceIdentifier);

      /**
       * Order is important
       * onInstanceCreated() should be called after this.instances.set(instanceIdentifier, instance); which
       * makes `isInitialized()` return true.
       */
      if (this.component.onInstanceCreated) {
        try {
          this.component.onInstanceCreated(
            this.container,
            instanceIdentifier,
            instance
          );
        } catch {
          // ignore errors in the onInstanceCreatedCallback
        }
      }
    }

    return instance || null;
  }

  private normalizeInstanceIdentifier(
    identifier: string = DEFAULT_ENTRY_NAME
  ): string {
    if (this.component) {
      return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME;
    } else {
      return identifier; // assume multiple instances are supported before the component is provided.
    }
  }

  private shouldAutoInitialize(): boolean {
    return (
      !!this.component &&
      this.component.instantiationMode !== InstantiationMode.EXPLICIT
    );
  }
}

// undefined should be passed to the service factory for the default instance
function normalizeIdentifierForFactory(identifier: string): string | undefined {
  return identifier === DEFAULT_ENTRY_NAME ? undefined : identifier;
}

function isComponentEager<T extends Name>(component: Component<T>): boolean {
  return component.instantiationMode === InstantiationMode.EAGER;
}
