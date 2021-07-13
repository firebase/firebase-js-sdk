/**
 * @license
 * Copyright 2020 Google LLC
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

// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { TypeUuid } from '@rushstack/node-core-library';

/**
 * This is an internal part of the plugin infrastructure.
 *
 * @remarks
 * This object is the constructor parameter for API Documenter plugin features.
 *
 * @public
 */
export class PluginFeatureInitialization {
  /** @internal */
  public _context!: PluginFeatureContext;

  /** @internal */
  public constructor() {
    // reserved for future use
  }
}

/**
 * Context object for {@link PluginFeature}.
 * Exposes various services that can be used by a plugin.
 *
 * @public
 */
export class PluginFeatureContext {}

const uuidPluginFeature: string = '56876472-7134-4812-819e-533de0ee10e6';

/**
 * The abstract base class for all API Documenter plugin features.
 * @public
 */
export abstract class PluginFeature {
  /**
   * Exposes various services that can be used by a plugin.
   */
  public context: PluginFeatureContext;

  /**
   * The subclass should pass the `initialization` through to the base class.
   * Do not put custom initialization code in the constructor.  Instead perform your initialization in the
   * `onInitialized()` event function.
   * @internal
   */
  public constructor(initialization: PluginFeatureInitialization) {
    // reserved for future expansion
    this.context = initialization._context;
  }

  /**
   * This event function is called after the feature is initialized, but before any processing occurs.
   * @virtual
   */
  public onInitialized(): void {
    // (implemented by child class)
  }

  public static [Symbol.hasInstance](instance: object): boolean {
    return TypeUuid.isInstanceOf(instance, uuidPluginFeature);
  }
}

TypeUuid.registerClass(PluginFeature, uuidPluginFeature);
