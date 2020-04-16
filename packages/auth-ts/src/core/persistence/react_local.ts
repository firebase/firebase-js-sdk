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

import {
  Persistence,
  PersistenceType,
  PersistenceValue,
  Instantiator
} from '../persistence';

import AsyncStorage from '@react-native-community/async-storage';

class ReactNativeLocalPersistence implements Persistence {
  type: PersistenceType = PersistenceType.LOCAL;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async set(key: string, value: PersistenceValue): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }

  async get<T extends PersistenceValue>(
    key: string,
    instantiator?: Instantiator<T>
  ): Promise<T | null> {
    const json = await AsyncStorage.getItem(key);
    const obj = json ? JSON.parse(json) : null;
    return instantiator && obj ? instantiator(obj) : obj;
  }

  async remove(key: string): Promise<void> {
    const json = await AsyncStorage.removeItem(key);
  }
}

export const reactNativeLocalPersistence: Persistence = new ReactNativeLocalPersistence();
