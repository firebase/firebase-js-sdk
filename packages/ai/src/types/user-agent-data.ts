/**
 * @license
 * Copyright 2025 Google LLC
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
 * Exports the minimal subset of
 * https://github.com/lukewarlow/user-agent-data-types
 * required by this SDK. That package is designed to be
 * imported using triple slash references, which are
 * prohibited in this SDK by TSLint.
 */

export interface NavigatorUA {
  readonly userAgentData?: NavigatorUAData;
}

interface NavigatorUABrandVersion {
  readonly brand: string;
  readonly version: string;
}

export interface UADataValues {
  readonly brands?: NavigatorUABrandVersion[];
}

interface UALowEntropyJSON {
  readonly brands: NavigatorUABrandVersion[];
}

interface NavigatorUAData extends UALowEntropyJSON {}
