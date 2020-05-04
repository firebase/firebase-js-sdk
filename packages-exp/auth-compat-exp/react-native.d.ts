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

/**
 * Basic stub for what is expected from the package 'react-native'.
 *
 * This should be a subset `@types/react-native` which cannot be installed
 * because it has conflicting definitions with typescript/dom. If included in
 * deps, yarn will attempt to install this in the root directory of the
 * monolithic repository which will then be included in the base `tsconfig.json`
 * via `typeroots` and then break every other package in this repo.
 */

declare module 'react-native' {
  interface ReactNativeAsyncStorage {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }
  export const AsyncStorage: ReactNativeAsyncStorage;
}
