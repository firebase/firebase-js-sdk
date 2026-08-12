/**
 * @license
 * Copyright 2026 Google LLC
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

import { use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import '../src/index.node';

use(chaiAsPromised);
use(sinonChai);

// Shim Mocha BDD hooks to Vitest equivalents
(globalThis as any).before = (globalThis as any).beforeAll;
(globalThis as any).after = (globalThis as any).afterAll;
