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

export const EventAccumulatorFactory = {
  waitsForCount: maxCount => {
    let count = 0;
    const condition = () => ea.eventData.length >= count;
    const ea = new EventAccumulator(condition);
    ea.onReset(() => {
      count = 0;
    });
    ea.onEvent(() => {
      count++;
    });
    return ea;
  }
};

export class EventAccumulator {
  public eventData = [];
  public promise;
  public resolve;
  public reject;
  private onResetFxn;
  private onEventFxn;
  constructor(public condition: Function) {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
  addEvent(eventData?: any) {
    this.eventData = [...this.eventData, eventData];
    if (typeof this.onEventFxn === 'function') this.onEventFxn();
    if (this._testCondition()) {
      this.resolve(this.eventData);
    }
  }
  reset(condition?: Function) {
    this.eventData = [];
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
    if (typeof this.onResetFxn === 'function') this.onResetFxn();
    if (typeof condition === 'function') this.condition = condition;
  }
  onEvent(cb: Function) {
    this.onEventFxn = cb;
  }
  onReset(cb: Function) {
    this.onResetFxn = cb;
  }
  _testCondition() {
    return this.condition();
  }
}
