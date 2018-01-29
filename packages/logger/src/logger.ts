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

/**
 * This is the file that people using Node.js will actually import. You should
 * only include this file if you have something specific about your
 * implementation that mandates having a separate entrypoint. Otherwise you can
 * just use index.ts
 */

/**
 * A container for all of the Logger instances
 */
export const instances: Logger[] = [];

export enum LogLevel {
  DEBUG,
  VERBOSE,
  INFO,
  WARN,
  ERROR,
  SILENT
}

export type LogHandler = (type: LogLevel, level: LogLevel, ...args: any[]) => void;

const defaultLogHandler: LogHandler = (type: LogLevel, level: LogLevel, ...args: any[]) => {
  if (type < level) return;
  switch (type) {
    case LogLevel.SILENT:
      return;
    case LogLevel.VERBOSE:
      console.log(...args);
      break;
    case LogLevel.INFO:
      console.info(...args);
      break;
    case LogLevel.WARN:
      console.warn(...args);
      break;
    case LogLevel.ERROR:
      console.error(...args);
      break;
    default:
      console.debug(...args);
  }
};


export class Logger {
  constructor() {
    /**
     * Capture the current instance for later use
     */
    instances.push(this);
  }
  private _logLevel = LogLevel.WARN;
  get logLevel() {
    return this._logLevel;
  }
  set logLevel(val) {
    if (!(val in LogLevel)) {
      throw new TypeError('Attempted to Invalid value assigned to `logLevel`');
    }
    this._logLevel = val;
  }

  private _logHandler: LogHandler = defaultLogHandler;
  get logHandler() {
    return this._logHandler;
  }
  set logHandler(val) {
    if (typeof val !== 'function') {
      throw new TypeError('Value assigned to `logHandler` must be a function');
    }
    this._logHandler = val;
  }

  debug(...args) {
    this._logHandler(LogLevel.DEBUG, this._logLevel, ...args);
  }
  log(...args) {
    this._logHandler(LogLevel.VERBOSE, this._logLevel, ...args);
  }
  info(...args) {
    this._logHandler(LogLevel.INFO, this._logLevel, ...args);
  }
  warn(...args) {
    this._logHandler(LogLevel.WARN, this._logLevel, ...args);
  }
  error(...args) {
    this._logHandler(LogLevel.ERROR, this._logLevel, ...args);
  }
}
