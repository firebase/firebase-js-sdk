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
import { name } from '../../../../../../packages/firebase/package.json';
import { LogLevel } from '@firebase/logger';

export let basicVarDeclarationExportFar: string;
export const basicVarStatementExportFar = 'basicVarStatementExportFar';
export const reExportVarStatmentExportFar = name;

export enum BasicEnumExportFar {
  DEBUG = 0,
  VERBOSE = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  SILENT = 5
}

export class BasicClassExportFar {}

export function basicFuncExportNoDependenciesFar(): string {
  return 'basicFuncExportNoDependenciesFar';
}
export function basicFuncExportVarDependenciesFar(): string {
  return basicVarStatementExportFar;
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
export function basicFuncExportFuncDependenciesFar(): string {
  return d3();
}

export function basicFuncExportEnumDependenciesFar(): BasicEnumExportFar {
  return BasicEnumExportFar.DEBUG;
}

export function basicFuncExternalDependenciesFar(): LogLevel {
  return LogLevel.ERROR;
}
