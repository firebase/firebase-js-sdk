/**
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

import { exceptionGuard } from '../../core/util/util';

/**
 * This class ensures the packets from the server arrive in order
 * This class takes data from the server and ensures it gets passed into the callbacks in order.
 * @constructor
 */
export class PacketReceiver {
  pendingResponses: any[] = [];
  currentResponseNum = 0;
  closeAfterResponse = -1;
  onClose: (() => void) | null = null;

  /**
   * @param onMessage_
   */
  constructor(private onMessage_: (a: Object) => void) {}

  closeAfter(responseNum: number, callback: () => void) {
    this.closeAfterResponse = responseNum;
    this.onClose = callback;
    if (this.closeAfterResponse < this.currentResponseNum) {
      this.onClose();
      this.onClose = null;
    }
  }

  /**
   * Each message from the server comes with a response number, and an array of data. The responseNumber
   * allows us to ensure that we process them in the right order, since we can't be guaranteed that all
   * browsers will respond in the same order as the requests we sent
   * @param {number} requestNum
   * @param {Array} data
   */
  handleResponse(requestNum: number, data: any[]) {
    this.pendingResponses[requestNum] = data;
    while (this.pendingResponses[this.currentResponseNum]) {
      const toProcess = this.pendingResponses[this.currentResponseNum];
      delete this.pendingResponses[this.currentResponseNum];
      for (let i = 0; i < toProcess.length; ++i) {
        if (toProcess[i]) {
          exceptionGuard(() => {
            this.onMessage_(toProcess[i]);
          });
        }
      }
      if (this.currentResponseNum === this.closeAfterResponse) {
        if (this.onClose) {
          this.onClose();
          this.onClose = null;
        }
        break;
      }
      this.currentResponseNum++;
    }
  }
}
