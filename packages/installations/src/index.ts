/**
 * Firebase Installations
 *
 * @packageDocumentation
 */

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

import { registerInstallations } from './functions/config';
import { registerVersion } from '@firebase/app';
import { name, version } from '../package.json';

export * from './api';
export * from './interfaces/public-types';

registerInstallations();
registerVersion(name, version);
// BUILD_TARGET will be replaced by values like esm5, esm2017, cjs5, etc during the compilation
registerVersion(name, version, '__BUILD_TARGET__');
