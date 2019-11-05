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

import { Provider } from './provider';
import { Component } from './component';
import { Name, NameServiceMapping } from './types';

export class ComponentContainer {
  private readonly providers = new Map<string, Provider>();

  constructor(private readonly name: string) {}

  /**
   *
   * @param component Component being added
   * @param overwrite When a component with the same name has already been registered,
   * if overwrite is true: overwrite the existing component with the new component and create a new
   * provider with the new component. It can be useful in tests where you want to use different mocks
   * for different tests.
   * if overwrite is false: throw an exception
   */
  addComponent(component: Component): void {
    let provider = this.getProviderInternal(component.name);
    if (provider.isComponentSet()) {
      throw new Error(
        `Component ${component.name} has already been registered with ${this.name}`
      );
    }

    provider.setComponent(component);
  }

  addOrOverwriteComponent(component: Component): void {
    let provider = this.getProviderInternal(component.name);
    if (provider.isComponentSet()) {
      // delete the existing provider from the container, so we can register the new component
      this.providers.delete(component.name);
    }

    this.addComponent(component);
  }

  /**
   * getProvider provides a type safe interface where it can only be called with a field name
   * present in NameServiceMapping interface.
   *
   * Firebase SDKs providing services should extend NameServiceMapping interface to register
   * themselves.
   */
  getProvider<T extends Name>(name: T): Provider<NameServiceMapping[T]> {
    return this.getProviderInternal(name) as Provider<NameServiceMapping[T]>;
  }

  getProviders(): Provider[] {
    return Array.from(this.providers.values());
  }

  private getProviderInternal(name: string): Provider {
    if (this.providers.has(name)) {
      return this.providers.get(name) as Provider;
    }

    // create a Provider for a service that hasn't registered with Firebase
    const provider = new Provider(name, this);
    this.providers.set(name, provider);

    return provider as Provider;
  }
}
