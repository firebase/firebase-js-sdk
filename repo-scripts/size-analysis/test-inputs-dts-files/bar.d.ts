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
export declare let basicVarDeclarationExportBar: string;
export declare const basicVarStatementExportBar = 'basicVarStatementExportBar';
export declare const reExportVarStatmentExportBar: string;
export declare enum BasicEnumExportBar {
  DEBUG = 0,
  VERBOSE = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  SILENT = 5
}
export declare class BasicClassExportBar {}
export declare function basicFuncExportNoDependenciesBar(): string;
export declare function basicFuncExportVarDependenciesBar(): string;
export declare function basicFuncExportFuncDependenciesBar(): string;
export declare function basicFuncExportEnumDependenciesBar(): BasicEnumExportBar;
export declare function basicFuncExternalDependenciesBar(): LogLevel;
