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
export declare let basicVarDeclarationExportFar: string;
export declare const basicVarStatementExportFar = 'basicVarStatementExportFar';
export declare const reExportVarStatmentExportFar: string;
export declare enum BasicEnumExportFar {
  DEBUG = 0,
  VERBOSE = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  SILENT = 5
}
export declare class BasicClassExportFar {}
export declare function basicFuncExportNoDependenciesFar(): string;
export declare function basicFuncExportVarDependenciesFar(): string;
export declare function basicFuncExportFuncDependenciesFar(): string;
export declare function basicFuncExportEnumDependenciesFar(): BasicEnumExportFar;
export declare function basicFuncExternalDependenciesFar(): LogLevel;
export declare function basicUniqueFuncFar(
  x: Array<{
    suit: string;
    card: number;
  }>
): number;
export declare function basicUniqueFuncFar(
  x: number
): {
  suit: string;
  card: number;
};
