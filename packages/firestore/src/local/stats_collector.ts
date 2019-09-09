/**
 * @license
 * Copyright 2019 Google Inc.
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
 * Collects the operation count from the persistence layer. Implementing
 * subclasses can expose this information to measure the efficiency of
 * persistence operations.
 *
 * The only consumer of operation counts is currently the LocalStoreTestCase
 * (via `AccumulatingStatsCollector`). If you are not interested in the stats,
 * you can use `newNoOpStatsCollector()` to create a default empty stats
 * collector.
 */
export class StatsCollector {
  /** Records the number of rows read for the given tag. */
  recordRowsRead(tag: string, count: number): void {}

  /** Records the number of rows deleted for the given tag. */
  recordRowsDeleted(tag: string, count: number): void {}

  /** Records the number of rows written for the given tag. */
  recordRowsWritten(tag: string, count: number): void {}

  /** Creates a stats collector that ignores all calls. */
  static newNoOpStatsCollector(): StatsCollector {
    return new StatsCollector();
  }
}

/* A test-only collector of operation counts from the persistence layer. */
export class AccumulatingStatsCollector extends StatsCollector {
  private rowsRead = new Map<string, number>();
  private rowsDeleted = new Map<string, number>();
  private rowsWritten = new Map<string, number>();

  recordRowsRead(tag: string, count: number): void {
    const currentValue = this.rowsRead.get(tag);
    this.rowsRead.set(tag, (currentValue || 0) + count);
  }

  recordRowsDeleted(tag: string, count: number): void {
    const currentValue = this.rowsRead.get(tag);
    this.rowsDeleted.set(tag, (currentValue || 0) + count);
  }

  recordRowsWritten(tag: string, count: number): void {
    const currentValue = this.rowsRead.get(tag);
    this.rowsWritten.set(tag, (currentValue || 0) + count);
  }

  /** Reset all operation counts */
  reset(): void {
    this.rowsRead.clear();
    this.rowsDeleted.clear();
    this.rowsWritten.clear();
  }

  /**
   * Returns the number of rows read for the given tag since the last call to
   * `reset()`.
   */
  getRowsRead(tag: string): number {
    return this.rowsRead.get(tag) || 0;
  }

  /**
   * Returns the number of rows written for the given tag since the last call to
   * `reset()`.
   */
  getRowsWritten(tag: string): number {
    return this.rowsWritten.get(tag) || 0;
  }

  /**
   * Returns the number of rows deleted for the given tag since the last call to
   * `reset()`.
   */
  getRowsDeleted(tag: string): number {
    return this.rowsDeleted.get(tag) || 0;
  }
}
