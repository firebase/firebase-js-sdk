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
import { version } from '../../../../../../packages/firebase/package.json';
import { LogLevel } from '@firebase/logger';

export let basicVarDeclarationExportBar: string;
export const basicVarStatementExportBar = 'basicVarStatementExportBar';
export const reExportVarStatmentExportBar = version;

export enum BasicEnumExportBar {
  DEBUG = 0,
  VERBOSE = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  SILENT = 5
}

export class BasicClassExportBar {}

export function basicFuncExportNoDependenciesBar(): string {
  return 'basicFuncExportNoDependenciesBar';
}
export function basicFuncExportVarDependenciesBar(): string {
  return basicVarStatementExportBar;
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
export function basicFuncExportFuncDependenciesBar(): string {
  return d3();
}

export function basicFuncExportEnumDependenciesBar(): BasicEnumExportBar {
  return BasicEnumExportBar.DEBUG;
}

export function basicFuncExternalDependenciesBar(): LogLevel {
  return LogLevel.ERROR;
}
