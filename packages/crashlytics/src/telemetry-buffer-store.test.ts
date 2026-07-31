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

  it('should enqueue and dequeue in FIFO order', () => {
    const queue = new RootTelemetryQueue(3);
    queue.enqueue('a');
    queue.enqueue('b');

    expect(queue.size).to.equal(2);
    expect(queue.peek()).to.equal('a');

    expect(queue.dequeue()).to.equal('a');

    queue.enqueue('c');

    expect(queue.size).to.equal(2);
    expect(queue.peek()).to.equal('b');
    expect(queue.dequeue()).to.equal('b');
    expect(queue.dequeue()).to.equal('c');
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

  it('should reclaim memory from internal storage (slice) when head exceeds limit', () => {
    const queue = new RootTelemetryQueue(2);
    queue.enqueue('a');
    queue.enqueue('b');

    // We dequeue 'a' and 'b' to advance head index
    expect(queue.dequeue()).to.equal('a');
    expect(queue.dequeue()).to.equal('b');

    // Currently _head is 2, which is equal to limit (2). Memory not reclaimed yet.
    expect((queue as any)._head).to.equal(2);
    expect((queue as any)._items).to.have.lengthOf(2);

    // Enqueue a third item
    queue.enqueue('c');
    expect((queue as any)._items).to.have.lengthOf(3);

    // Dequeue 'c' to push _head to 3 (> limit of 2) and trigger reclamation
    expect(queue.dequeue()).to.equal('c');

    // Now head should be reset to 0, and array sliced
    expect((queue as any)._head).to.equal(0);
    expect((queue as any)._items).to.have.lengthOf(0);
  });

  it('should clear the queue', () => {
    const queue = new RootTelemetryQueue(2);
    queue.enqueue('a');
    queue.enqueue('b');
    queue.clear();
    expect(queue.size).to.equal(0);
    expect(queue.peek()).to.be.undefined;
  });
});
