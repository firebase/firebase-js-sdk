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
import { LogLevel } from '@firebase/logger';
import { license } from '../package.json';
// wildcard export
export * from './bar';
// named export
export {
  BasicEnumExportFar,
  BasicClassExportFar,
  basicFuncExportNoDependenciesFar,
  basicFuncExportVarDependenciesFar,
  basicFuncExportFuncDependenciesFar,
  basicFuncExportEnumDependenciesFar,
  basicFuncExternalDependenciesFar,
  basicUniqueFuncFar,
  basicVarDeclarationExportFar,
  basicVarStatementExportFar,
  reExportVarStatmentExportFar
} from './far';
export let basicVarDeclarationExport: string;
export const basicVarStatementExport = 'basicVarStatementExport';
export const reExportVarStatmentExport = license;

export enum BasicEnumExport {
  DEBUG = 0,
  VERBOSE = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  SILENT = 5
}

export class BasicClassExport {}

export function basicFuncExportNoDependencies(): string {
  return 'basicFuncExportNoDependencies';
}
export function basicFuncExportVarDependencies(): string {
  return basicVarStatementExport;
}

function d1(): string {
  return 'd1';
}
function d2(): string {
  return 'd2';
}
function d3(): string {
  return d1() + d2();
}
export function basicFuncExportFuncDependencies(): string {
  return d3();
}

export function basicFuncExportEnumDependencies(): BasicEnumExport {
  return BasicEnumExport.DEBUG;
}

export function basicFuncExternalDependencies(): LogLevel {
  return LogLevel.WARN;
}

export function basicUniqueFunc(
  x: Array<{ suit: string; card: number }>
): number;
export function basicUniqueFunc(x: number): { suit: string; card: number };
export function basicUniqueFunc(
  x: number | Array<{ suit: string; card: number }>
): number | object {
  if (typeof x === 'object') {
    const pickedCard = Math.floor(Math.random() * x.length);
    return pickedCard;
  }
  // Otherwise just let them pick the card
  else if (typeof x === 'number') {
    return { suit: 'a', card: x % 13 };
  }
}

const appsNotExported: Map<string, number> = new Map();
const apps: Map<string, number> = new Map();
export { apps };

class FooNotExported {}
class Foo {}
export { Foo as Foo1 };

function foo(x: string): string {
  return x;
}
export { foo as foo2 };

export { tar as tarr, tar1 as tarr1 } from './tar';
// re-export from firebase external module
export { LogLevel } from '@firebase/logger';
