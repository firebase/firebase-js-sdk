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
import { InstantiationMode } from './types';

export class ComponentContainer {
  private providers = new Map<string, Provider>();
  private components = new Map<string, Component>();

  constructor(private name: string) {}

  addComponent(component: Component): void {
    if (this.components.has(component.name)) {
      throw new Error(
        `Component ${component.name} has already been registered with ${this.name}`
      );
    }

    this.components.set(component.name, component);

    const provider = this.getProvider(component.name);

    const isEager = this.isComponentEager(component);
    provider.provideFactory(
      component.instanceFactory,
      component.multipleInstances,
      isEager
    );
  }

  getProvider<T>(name: string): Provider<T> {
    if (this.providers.has(name)) {
      return this.providers.get(name) as Provider<T>;
    }

    // create a Provider for a service that hasn't registered with Firebase
    const provider = new Provider(name, this);
    this.providers.set(name, provider);

    return provider as Provider<T>;
  }

  getProviders(): Provider[] {
    return Array.from(this.providers, entry => entry[1]);
  }

  private isComponentEager(component: Component): boolean {
    return component.instantiationMode === InstantiationMode.EAGER;
  }
}
