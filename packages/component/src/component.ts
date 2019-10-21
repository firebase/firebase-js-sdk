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
import { InstantiationMode, InstanceFactory } from './types';

export class Component<T = unknown> {
  multipleInstances: boolean = false;
  /**
   * Properties to be added to the service namespace
   */
  serviceProps: { [key: string]: unknown } = {};

  instantiationMode: InstantiationMode = InstantiationMode.LAZY;

  /**
   *
   * @param name The public service name, e.g. app, auth, firestore, database
   * @param instanceFactory Service factory responsible for creating the public interface
   * @param type whehter the service provided by the component is public or private
   */
  constructor(
    public readonly name: string,
    public readonly instanceFactory: InstanceFactory<T>,
    public readonly type: ComponentType
  ) {}

  setInstantiationMode(mode: InstantiationMode): this {
    this.instantiationMode = mode;
    return this;
  }

  setMultipleInstances(multipleInstances: boolean): this {
    this.multipleInstances = multipleInstances;
    return this;
  }

  setServiceProps(props: { [key: string]: unknown }): this {
    this.serviceProps = props;
    return this;
  }
}

/**
 * PUBLIC: A public component provides a set of public APIs to customers. A service namespace will be patched
 * onto `firebase` namespace. Assume the component name is `test`, customers will be able
 * to get the service by calling `firebase.test()` or `app.test()` where `app` is a `FirebaseApp` instance.
 *
 * PRIVATE: A private component provides a set of private APIs that are used internally by other
 * Firebase SDKs. No serivce namespace is created in `firebase` namespace and customers have no way to get them.
 */
export enum ComponentType {
  PUBLIC,
  PRIVATE
}
