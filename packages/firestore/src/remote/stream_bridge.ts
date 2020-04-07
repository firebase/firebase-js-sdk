/**
 * @license
 * Copyright 2017 Google LLC
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

import { debugAssert } from '../util/assert';
import { FirestoreError } from '../util/error';

import { Stream } from './connection';

/**
 * Provides a simple helper class that implements the Stream interface to
 * bridge to other implementations that are streams but do not implement the
 * interface. The stream callbacks are invoked with the callOn... methods.
 */
export class StreamBridge<I, O> implements Stream<I, O> {
  private wrappedOnOpen: (() => void) | undefined;
  private wrappedOnClose: ((err?: FirestoreError) => void) | undefined;
  private wrappedOnMessage: ((msg: O) => void) | undefined;

  private sendFn: (msg: I) => void;
  private closeFn: () => void;

  constructor(args: { sendFn: (msg: I) => void; closeFn: () => void }) {
    this.sendFn = args.sendFn;
    this.closeFn = args.closeFn;
  }

  onOpen(callback: () => void): void {
    debugAssert(!this.wrappedOnOpen, 'Called onOpen on stream twice!');
    this.wrappedOnOpen = callback;
  }

  onClose(callback: (err?: FirestoreError) => void): void {
    debugAssert(!this.wrappedOnClose, 'Called onClose on stream twice!');
    this.wrappedOnClose = callback;
  }

  onMessage(callback: (msg: O) => void): void {
    debugAssert(!this.wrappedOnMessage, 'Called onMessage on stream twice!');
    this.wrappedOnMessage = callback;
  }

  close(): void {
    this.closeFn();
  }

  send(msg: I): void {
    this.sendFn(msg);
  }

  callOnOpen(): void {
    debugAssert(
      this.wrappedOnOpen !== undefined,
      'Cannot call onOpen because no callback was set'
    );
    this.wrappedOnOpen();
  }

  callOnClose(err?: FirestoreError): void {
    debugAssert(
      this.wrappedOnClose !== undefined,
      'Cannot call onClose because no callback was set'
    );
    this.wrappedOnClose(err);
  }

  callOnMessage(msg: O): void {
    debugAssert(
      this.wrappedOnMessage !== undefined,
      'Cannot call onMessage because no callback was set'
    );
    this.wrappedOnMessage(msg);
  }
}
