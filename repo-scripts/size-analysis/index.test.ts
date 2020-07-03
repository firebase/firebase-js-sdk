/**
 * @license
 * Copyright 2017 Google LLC
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

import { expect } from 'chai';

import { extractDeclarations, MemberList } from './analysis-helper';
import { ErrorCode } from './analysis';

import { retrieveTestModuleDtsFile } from './test-utils';
import { exec } from 'child_process';

describe('extractDeclarations', () => {
  let testModuleDtsFile: string;
  let extractedDeclarations: MemberList;
  before(function () {
    this.timeout(300000);
    testModuleDtsFile = retrieveTestModuleDtsFile();
    extractedDeclarations = extractDeclarations(testModuleDtsFile);
  });
  it('test basic variable extractions', () => {
    expect(extractedDeclarations.variables).to.include.members([
      'basicVarDeclarationExport',
      'basicVarStatementExport',
      'reExportVarStatmentExport'
    ]);
  });

  it('test re-exported variable extractions from same module', () => {
    expect(extractedDeclarations.variables).to.include.members([
      'basicVarDeclarationExportFar',
      'basicVarStatementExportFar',
      'reExportVarStatmentExportFar',
      'basicVarDeclarationExportBar',
      'basicVarStatementExportBar',
      'reExportVarStatmentExportBar'
    ]);
  });

  it('test basic function extractions', () => {
    expect(extractedDeclarations.functions).to.include.members([
      'basicFuncExportNoDependencies',
      'basicFuncExportVarDependencies',
      'basicFuncExportFuncDependencies',
      'basicFuncExportEnumDependencies',
      'basicFuncExternalDependencies'
    ]);
  });
  it('test basic function de-duplication ', () => {
    expect(extractedDeclarations.functions).include.members(['basicUniqueFunc']);

    expect(extractedDeclarations.functions.filter(each => each.localeCompare("basicUniqueFunc") === 0).length).to.equal(1);
  });


  it('test re-exported function extractions from same module', () => {
    expect(extractedDeclarations.functions).to.include.members([
      'basicFuncExportNoDependenciesFar',
      'basicFuncExportVarDependenciesFar',
      'basicFuncExportFuncDependenciesFar',
      'basicFuncExportEnumDependenciesFar',
      'basicFuncExternalDependenciesFar',
      'basicFuncExportNoDependenciesBar',
      'basicFuncExportVarDependenciesBar',
      'basicFuncExportFuncDependenciesBar',
      'basicFuncExportEnumDependenciesBar',
      'basicFuncExternalDependenciesBar'
    ]);
  });

  it('test re-exported function de-duplication from same module ', () => {
    expect(extractedDeclarations.functions).include.members(['basicUniqueFuncFar']);

    expect(extractedDeclarations.functions.filter(each => each.localeCompare("basicUniqueFuncFar") === 0).length).to.equal(1);
  });


  it('test basic class extractions', () => {
    expect(extractedDeclarations.classes).to.include.members([
      'BasicClassExport'
    ]);
  });

  it('test re-exported class extractions from same module', () => {
    expect(extractedDeclarations.classes).to.include.members([
      'BasicClassExportFar',
      'BasicClassExportBar'
    ]);
  });

  it('test basic enum extractions', () => {
    expect(extractedDeclarations.enums).to.include.members(['BasicEnumExport']);
  });

  it('test re-exported enum extractions from same module', () => {
    expect(extractedDeclarations.enums).to.include.members([
      'BasicEnumExportFar',
      'BasicEnumExportBar'
    ]);
  });

  it('test re-exported enum extractions from firebase external module', () => {
    expect(extractedDeclarations.enums).to.include.members(['LogLevel']);
  });


});


xdescribe('test command line interface', () => {
  it('test adhoc run valid flag combinations', () => {
    expect(async () => {
      exec("../../node_modules/.bin/ts-node-script analysis.ts --if \"../../packages-exp/dummy-exp/dist/packages-exp/dummy-exp/src/index.d.ts\" -o \"./dependencies/dependencies/adhoc.json\"", (err, stdout, stderr) => {
        if (err) { throw err; }
        else if (stderr) { throw new Error(stderr); }

      });
    }).to.throw();

  });

});
