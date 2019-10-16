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
import { InstantiationMode, ServiceFactory } from './types';

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
   * @param serviceFactory Service factory responsible for creating the public interface
   * @param type whehter the service provided by the component is public or private
   */
  constructor(
    public readonly name: string,
    public readonly serviceFactory: ServiceFactory<T>,
    public readonly type = ComponentType.PRIVATE
  ) {}

  setInstantiationMode(mode: InstantiationMode): this {
    this.instantiationMode = mode;
    return this;
  }

  setMultipleInstance(multipleInstances: boolean): this {
    this.multipleInstances = multipleInstances;
    return this;
  }

  setServiceProps(props: { [key: string]: unknown }): this {
    this.serviceProps = props;
    return this;
  }
}

export enum ComponentType {
  PUBLIC,
  PRIVATE
}
