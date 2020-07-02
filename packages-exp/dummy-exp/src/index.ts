/**
 * @license
 * Copyright 2020 Google LLC
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

export * from './bar';

export * from './foo';

export { far1, far as farrrrr, far3 as far4 } from './far';
export const VAR = 'variable';
export let var2: string;
export let var3 = 'var3';
export class Student { }
import { LogLevel } from '@firebase/logger';
var3 = 'var3Changed';

export function boo(): LogLevel {
  return LogLevel.DEBUG;
}
export function boo1(a: string): string {
  if (a) {
    return a;
  }
  return "not a";
}
export enum LogLevel1 {
  DEBUG = 0,
  VERBOSE = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  SILENT = 5
}

export interface LogCallbackParams {
  level: LogLevel1;
  message: string;
  args: unknown[];
  type: string;
}

export type LogLevel2 =
  | 'debug'
  | 'error'
  | 'silent'
  | 'warn'
  | 'info'
  | 'verbose';

export const { a, b } = { a: "a", b: "b" };
export { LogLevel } from '@firebase/logger';

export function pickCard(x: Array<{ suit: string; card: number; }>): number;
export function pickCard(x: number): { suit: string; card: number; };
export function pickCard(x: number | Array<{ suit: string; card: number; }>) {

  if (typeof x === "object") {
    const pickedCard = Math.floor(Math.random() * x.length);
    return pickedCard;
  }
  // Otherwise just let them pick the card
  else if (typeof x === "number") {

    return { suit: "a", card: x % 13 };
  }
}