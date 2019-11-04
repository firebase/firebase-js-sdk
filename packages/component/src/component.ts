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
import { InstantiationMode, InstanceFactory, ComponentType, Dictionary } from './types';

export class Component<T = unknown> {
  multipleInstances = false;
  /**
   * Properties to be added to the service namespace
   */
  serviceProps: Dictionary = {};

  instantiationMode = InstantiationMode.LAZY;

  /**
   *
   * @param name The public service name, e.g. app, auth, firestore, database
   * @param instanceFactory Service factory responsible for creating the public interface
   * @param type whehter the service provided by the component is public or private
   */
  constructor(
    readonly name: string,
    readonly instanceFactory: InstanceFactory<T>,
    readonly type: ComponentType
  ) {}

  setInstantiationMode(mode: InstantiationMode): this {
    this.instantiationMode = mode;
    return this;
  }

  setMultipleInstances(multipleInstances: boolean): this {
    this.multipleInstances = multipleInstances;
    return this;
  }

  setServiceProps(props: Dictionary): this {
    this.serviceProps = props;
    return this;
  }
}
