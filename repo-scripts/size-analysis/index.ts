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
import { license } from './package.json';
// wildcard export
export * from './src/bar';
// named export
export {
  BasicEnumExportFar,
  BasicClassExportFar,
  basicFuncExportNoDependenciesFar,
  basicFuncExportVarDependenciesFar,
  basicFuncExportFuncDependenciesFar,
  basicFuncExportEnumDependenciesFar,
  basicFuncExternalDependenciesFar,
  basicVarDeclarationExportFar,
  basicVarStatementExportFar,
  reExportVarStatmentExportFar
} from './src/far';

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

// re-export from firebase external module
export { LogLevel } from '@firebase/logger';
