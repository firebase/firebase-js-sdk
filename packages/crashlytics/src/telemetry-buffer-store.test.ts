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

import { expect } from 'chai';
import { RootTelemetryQueue } from './telemetry-buffer-store';

describe('RootTelemetryQueue', () => {
  it('should initialize empty', () => {
    const queue = new RootTelemetryQueue(2);
    expect(queue.size).to.equal(0);
    expect(queue.peek()).to.be.undefined;
    expect(queue.dequeue()).to.be.undefined;
  });

  it('should enqueue and dequeue in FIFO order with circular wrapping', () => {
    const queue = new RootTelemetryQueue(3);
    queue.enqueue('a');
    queue.enqueue('b');

    expect(queue.size).to.equal(2);
    expect(queue.peek()).to.equal('a');

    expect(queue.dequeue()).to.equal('a'); // head = 1, tail = 2

    // Enqueuing here wraps the tail pointer around the circular array to index 0
    queue.enqueue('c');

    expect(queue.size).to.equal(2);
    expect(queue.peek()).to.equal('b');

    queue.enqueue('d'); // head = 1, tail = 1 (queue is now full)

    expect(queue.size).to.equal(3);
    expect(queue.peek()).to.equal('b');

    expect(queue.dequeue()).to.equal('b'); // head = 2, tail = 1
    expect(queue.dequeue()).to.equal('c'); // head = 0, tail = 1
    expect(queue.dequeue()).to.equal('d'); // head = 1, tail = 1

    expect(queue.size).to.equal(0);
    expect(queue.dequeue()).to.be.undefined;
  });

  it('should drop oldest item when limit is exceeded', () => {
    const queue = new RootTelemetryQueue(2);
    expect(queue.enqueue('a')).to.be.undefined;
    expect(queue.enqueue('b')).to.be.undefined;

    // Third item exceeds limit of 2, should drop and return the oldest ('a')
    expect(queue.enqueue('c')).to.equal('a');
    expect(queue.size).to.equal(2);
  });

  it('should clear the queue', () => {
    const queue = new RootTelemetryQueue(2);
    queue.enqueue('a');
    queue.enqueue('b');
    queue.clear();
    expect(queue.size).to.equal(0);
    expect(queue.peek()).to.be.undefined;
  });

  it('should throw an error if limit is less than or equal to 0', () => {
    expect(() => new RootTelemetryQueue(0)).to.throw(
      'Limit must be a positive integer greater than 0'
    );
    expect(() => new RootTelemetryQueue(-5)).to.throw(
      'Limit must be a positive integer greater than 0'
    );
  });
});
