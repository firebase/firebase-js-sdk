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

import firebase from '@firebase/app-compat';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { FunctionsService } from './service';
import '@firebase/functions-exp';
import {
  Component,
  ComponentType,
  InstanceFactory,
  ComponentContainer
} from '@firebase/component';
import { FirebaseApp } from '@firebase/app-types';
import { Functions as FunctionsServiceExp } from '@firebase/functions-types-exp';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'app-compat': FirebaseApp;
    'functions-compat': FunctionsService;
    'functions-exp': FunctionsServiceExp;
  }
}

const factory: InstanceFactory<'functions-compat'> = (
  container: ComponentContainer,
  regionOrCustomDomain?: string
) => {
  // Dependencies
  const app = container.getProvider('app-compat').getImmediate();
  const functionsServiceExp = container
    .getProvider('functions-exp')
    .getImmediate({
      identifier: regionOrCustomDomain
    });

  return new FunctionsService(app as FirebaseApp, functionsServiceExp);
};

export function registerFunctions(): void {
  const namespaceExports = {
    // no-inline
    Functions: FunctionsService
  };
  (firebase as _FirebaseNamespace).INTERNAL.registerComponent(
    new Component('functions-compat', factory, ComponentType.PUBLIC)
      .setServiceProps(namespaceExports)
      .setMultipleInstances(true)
  );
}
