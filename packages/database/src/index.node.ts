/**
 * @license
 * Copyright 2021 Google LLC
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

// Use default import to import a cjs library, so we can provide a esm entrypoint for Nodejs.
// We can't use named import here because otherwise you will get the following error:
// "SyntaxError: Named export 'Client' not found. The requested module 'faye-websocket' is a CommonJS module".
// We can change back to using named imports once the lib provides an esm build, however they are not planning to.
// see https://github.com/faye/faye-websocket-node/issues/82
import Websocket from 'faye-websocket';

import { setWebSocketImpl } from '../src/realtime/WebSocketConnection';

import { registerDatabase } from './register';

setWebSocketImpl(Websocket.Client);

export * from './api';

registerDatabase('node');
