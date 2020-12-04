/**
 * @license
 * Copyright 2017 Google Inc.
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

const repl = require('repl');
const firebase = require('../packages/firebase');

function clearTerminal() {
  return process.stdout.write('\033c');
}

function giveContext() {
  console.log(`Welcome to the firebase REPL!

The current firebase build is has been assigned to the \`firebase\` variable.

Utility Commands Available:

.clear - Resets the current REPL
.exit - exits the REPL
.help - prints this message
`);
}

function addFirebaseToContext(repl) {
  Object.defineProperty(repl.context, 'firebase', {
    configurable: false,
    enumerable: true,
    value: firebase
  });
}

clearTerminal();
giveContext();

const replInst = repl.start('> ');
replInst.on('reset', () => {
  clearTerminal();
  giveContext();
  addFirebaseToContext(replInst);
});

addFirebaseToContext(replInst);

replInst.defineCommand('help', () => {
  giveContext();
  replInst.displayPrompt();
});
