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
export * from './bar';
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
export declare let basicVarDeclarationExport: string;
export declare const basicVarStatementExport = 'basicVarStatementExport';
export declare const reExportVarStatmentExport: string;
export declare enum BasicEnumExport {
  DEBUG = 0,
  VERBOSE = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  SILENT = 5
}
export declare class BasicClassExport {}
export declare function basicFuncExportNoDependencies(): string;
export declare function basicFuncExportVarDependencies(): string;
export declare function basicFuncExportFuncDependencies(): string;
export declare function basicFuncExportEnumDependencies(): BasicEnumExport;
export declare function basicFuncExternalDependencies(): LogLevel;
export declare function basicUniqueFunc(
  x: Array<{
    suit: string;
    card: number;
  }>
): number;
export declare function basicUniqueFunc(
  x: number
): {
  suit: string;
  card: number;
};
declare const apps: Map<string, number>;
export { apps };
declare class Foo {}
export { Foo as Foo1 };
declare function foo(x: string): string;
export { foo as foo2 };
export { tar as tarr, tar1 as tarr1 } from './tar';
export { LogLevel } from '@firebase/logger';
