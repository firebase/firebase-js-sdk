/**
 * @license
 * Copyright 2023 Google LLC
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
 * Convenience class for logging to console.log().
 *
 * Each log message is prefixed with the "scriptName" given to the constructor,
 * any additional "logPrefixes" given to the constructor, and a timestamp.
 * The timestamp starts at 0 and increases monotonically.
 */
export class Logger {
  /**
   * Creates a new Logger instance.
   *
   * @param scriptName The name of the script that is creating the logger; each
   * logged message will be prefixed with this string. Using the script name
   * helps to correlate log messages with the script that is producing the
   * messages.
   * @param logPrefixes A (possibly empty) array of strings that are additional
   * log prefixes that will be prefixed to each log message _after_ the given
   * `scriptName`; may be `undefined`, which has the same effect as specifying
   * an empty array.
   */
  constructor(scriptName, logPrefixes) {
    const pidStr = `[${process.pid}]`;
    this._logPrefixes = [scriptName, pidStr].concat(logPrefixes ?? []);
    this._startTimeMilliseconds = null;
  }

  /**
   * Logs a message to `console.log()`.
   *
   * This function accepts zero or many arguments, each of which is specified
   * individually to `console.log()`. The log message will be prefixed with
   * other strings, as described elsewhere in this class.
   *
   * The first invocation of this method initializes the "start time", which is
   * used to calculate the elapsed time of all subsequent log messages. Each
   * log message will be prefixed with the elapsed time since the first
   * invocation of this method.
   */
  log() {
    console.log(...this._logPrefixes, this._elapsedTimeStr(), ...arguments);
  }

  /**
   * Calculates the amount of time since the first invocation of this method on
   * this object and returns it as a human-friendly string that is suitable for
   * inclusion in log messages.
   *
   * Upon the first invocation, the "start time" is initialized and an elapsed
   * time of 0 (zero) is used.
   */
  _elapsedTimeStr() {
    const milliseconds = this._getElapsedMilliseconds();
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = (milliseconds - minutes * 1000 * 60) / 1000;
    return (
      (minutes < 10 ? '0' : '') +
      minutes +
      ':' +
      (seconds < 10 ? '0' : '') +
      seconds.toFixed(3)
    );
  }

  /**
   * Calculates the amount of time, in milliseconds, since the first invocation
   * of this method on this object and returns it.
   *
   * Upon the first invocation, the "start time" is initialized and an elapsed
   * time of 0 (zero) is returned.
   */
  _getElapsedMilliseconds() {
    const currentTimeMilliseconds = getCurrentMonotonicTimeMilliseconds();
    if (this._startTimeMilliseconds === null) {
      this._startTimeMilliseconds = currentTimeMilliseconds;
      return 0;
    }
    return currentTimeMilliseconds - this._startTimeMilliseconds;
  }
}

/**
 * Returns the current time, in milliseconds, from a monotonic clock.
 */
function getCurrentMonotonicTimeMilliseconds() {
  const currentTime = process.hrtime();
  return currentTime[0] * 1000 + currentTime[1] / 1_000_000;
}
