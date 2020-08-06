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

import {
  extractDeclarations,
  MemberList,
  dedup,
  mapSymbolToType,
  replaceAll,
  writeReportToFile,
  ErrorCode,
  writeReportToDirectory,
  External,
  extractExternalDependencies,
  buildMap
} from '../analysis-helper';

import {
  getTestModuleDtsFilePath,
  getAssortedImportsJsFilePath,
  getSubsetExportsBundleFilePath
} from './utils';
import * as fs from 'fs';
import { resolve } from 'path';

describe('extractDeclarations on .d.ts file', () => {
  let testModuleDtsFile: string;
  let extractedDeclarations: MemberList;
  before(() => {
    testModuleDtsFile = getTestModuleDtsFilePath();
    extractedDeclarations = extractDeclarations(testModuleDtsFile);
  });
  // export {tar as tarr, tar1 as tarr1} from '..'
  it('test export rename', () => {
    expect(extractedDeclarations.functions).to.include.members([
      'tarr',
      'tarr1'
    ]);
  });
  // function foo() { }
  // export { foo as foo2 };
  it('test declare then export', () => {
    expect(extractedDeclarations.functions).to.include.members(['foo2']);
    expect(extractedDeclarations.classes).to.include.members(['Foo1']);
  });

  it('test basic variable extractions', () => {
    expect(extractedDeclarations.variables).to.include.members([
      'basicVarDeclarationExport',
      'basicVarStatementExport',
      'reExportVarStatmentExport'
    ]);
  });
  it('test re-exported variable extractions from same module - named re-exports', () => {
    expect(extractedDeclarations.variables).to.include.members([
      'basicVarDeclarationExportFar',
      'basicVarStatementExportFar',
      'reExportVarStatmentExportFar'
    ]);
  });
  it('test re-exported variable extractions from same module - * re-exports', () => {
    expect(extractedDeclarations.variables).to.include.members([
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
    expect(extractedDeclarations.functions).include.members([
      'basicUniqueFunc'
    ]);

    expect(
      extractedDeclarations.functions.filter(
        each => each.localeCompare('basicUniqueFunc') === 0
      ).length
    ).to.equal(1);
  });

  it('test re-exported function extractions from same module - named re-exports', () => {
    expect(extractedDeclarations.functions).to.include.members([
      'basicFuncExportNoDependenciesFar',
      'basicFuncExportVarDependenciesFar',
      'basicFuncExportFuncDependenciesFar',
      'basicFuncExportEnumDependenciesFar',
      'basicFuncExternalDependenciesFar'
    ]);
  });

  it('test re-exported function extractions from same module - * re-exports', () => {
    expect(extractedDeclarations.functions).to.include.members([
      'basicFuncExportNoDependenciesBar',
      'basicFuncExportVarDependenciesBar',
      'basicFuncExportFuncDependenciesBar',
      'basicFuncExportEnumDependenciesBar',
      'basicFuncExternalDependenciesBar'
    ]);
  });

  it('test re-exported function de-duplication from same module ', () => {
    expect(extractedDeclarations.functions).include.members([
      'basicUniqueFuncFar'
    ]);

    expect(
      extractedDeclarations.functions.filter(
        each => each.localeCompare('basicUniqueFuncFar') === 0
      ).length
    ).to.equal(1);
  });

  it('test basic class extractions', () => {
    expect(extractedDeclarations.classes).to.include.members([
      'BasicClassExport'
    ]);
  });

  it('test re-exported class extractions from same module - named re-exports', () => {
    expect(extractedDeclarations.classes).to.include.members([
      'BasicClassExportFar'
    ]);
  });
  it('test re-exported class extractions from same module - * re-exports', () => {
    expect(extractedDeclarations.classes).to.include.members([
      'BasicClassExportBar'
    ]);
  });

  it('test basic enum extractions', () => {
    expect(extractedDeclarations.enums).to.include.members(['BasicEnumExport']);
  });

  it('test re-exported enum extractions from same module - named re-exports', () => {
    expect(extractedDeclarations.enums).to.include.members([
      'BasicEnumExportFar'
    ]);
  });
  it('test re-exported enum extractions from same module - * re-exports', () => {
    expect(extractedDeclarations.enums).to.include.members([
      'BasicEnumExportBar'
    ]);
  });
  // import {LogLevel as LogLevel1} from '@firebase/logger';
  // export {LogLevel1 as LogLevel2};
  it('test renamed import then renamed export', () => {
    expect(extractedDeclarations.enums).to.include.members(['LogLevel2']);
  });

  //import { Logger } from "@firebase/logger";
  // export { Logger as Logger1 };
  it('test import then renamed export', () => {
    expect(extractedDeclarations.classes).to.include.members(['Logger1']);
  });

  //import { setLogLevel } from "@firebase/logger";
  // export { setLogLevel };
  it('test import then export', () => {
    expect(extractedDeclarations.functions).to.include.members(['setLogLevel']);
  });

  // import * as fs from 'fs'
  // import * as tmp from 'tmp'
  // export declare const aVar: tmp.FileOptions;
  // export { fs as fs1 };
  it('test namespace export', () => {
    expect(extractedDeclarations.variables).to.include.members(['fs1']);
    expect(extractedDeclarations.variables).to.not.include.members(['tmp']);
    expect(extractedDeclarations.variables).to.include.members(['aVar']);
  });
});
describe('extractDeclarations on js bundle file', () => {
  let subsetExportsBundleFile: string;
  let extractedDeclarations: MemberList;
  before(() => {
    const testModuleDtsFile: string = getTestModuleDtsFilePath();
    const map: Map<string, string> = buildMap(
      extractDeclarations(testModuleDtsFile)
    );
    subsetExportsBundleFile = getSubsetExportsBundleFilePath();
    extractedDeclarations = extractDeclarations(subsetExportsBundleFile, map);
  });
  it('test variable extractions', () => {
    const variablesArray = ['aVar', 'fs1'];
    variablesArray.sort();
    expect(extractedDeclarations.variables).to.have.members(variablesArray);
  });

  it('test functions extractions', () => {
    const functionsArray = [
      'tar',
      'tarr1',
      'basicFuncExportEnumDependencies',
      'd1',
      'd2',
      'd3',
      'basicFuncExportFuncDependenciesBar'
    ];
    functionsArray.sort();
    expect(extractedDeclarations.functions).to.have.members(functionsArray);
  });

  it('test enums extractions', () => {
    const enumsArray = [
      'BasicEnumExport',
      'LogLevel2',
      'BasicEnumExportBar',
      'BasicEnumExportFar'
    ];
    enumsArray.sort();
    expect(extractedDeclarations.enums).to.have.members(enumsArray);
  });

  it('test classes extractions', () => {
    const classesArray = ['Logger1'];
    classesArray.sort();
    expect(extractedDeclarations.classes).to.have.members(classesArray);
  });
});

describe('test dedup helper function', () => {
  it('test dedup with non-empty entries', () => {
    let memberList: MemberList = {
      functions: ['aFunc', 'aFunc', 'bFunc', 'cFunc'],
      classes: ['aClass', 'bClass', 'aClass', 'cClass'],
      variables: ['aVar', 'bVar', 'cVar', 'aVar'],
      enums: ['aEnum', 'bEnum', 'cEnum', 'dEnum'],
      externals: []
    };
    memberList = dedup(memberList);

    expect(memberList.functions).to.have.length(3);
    expect(memberList.classes).to.have.length(3);
    expect(memberList.variables).to.have.length(3);
    expect(memberList.enums).to.have.length(4);
    expect(
      memberList.functions.filter(each => each.localeCompare('aFunc') === 0)
        .length
    ).to.equal(1);
    expect(
      memberList.classes.filter(each => each.localeCompare('aClass') === 0)
        .length
    ).to.equal(1);
    expect(
      memberList.variables.filter(each => each.localeCompare('aVar') === 0)
        .length
    ).to.equal(1);
    expect(
      memberList.enums.filter(each => each.localeCompare('aEnum') === 0).length
    ).to.equal(1);
  });

  it('test dedup with empty entries', () => {
    let memberList: MemberList = {
      functions: [],
      classes: [],
      variables: ['aVar', 'bVar', 'cVar', 'aVar'],
      enums: [],
      externals: []
    };
    memberList = dedup(memberList);
    expect(memberList.functions).to.have.length(0);
    expect(memberList.classes).to.have.length(0);
    expect(memberList.enums).to.have.length(0);
    expect(memberList.variables).to.have.length(3);

    expect(
      memberList.variables.filter(each => each.localeCompare('aVar') === 0)
        .length
    ).to.equal(1);
  });
});

describe('test replaceAll helper function', () => {
  it('test replaceAll with multiple occurences of an element', () => {
    const memberList: MemberList = {
      functions: ['aFunc', 'aFunc', 'bFunc', 'cFunc'],
      classes: ['aClass', 'bClass', 'aClass', 'cClass'],
      variables: ['aVar', 'bVar', 'cVar', 'aVar'],
      enums: ['aEnum', 'bEnum', 'cEnum', 'dEnum'],
      externals: []
    };
    const original: string = 'aFunc';
    const replaceTo: string = 'replacedFunc';
    replaceAll(memberList, original, replaceTo);
    expect(memberList.functions).to.not.include.members([original]);
    expect(memberList.functions).to.include.members([replaceTo]);
    expect(memberList.functions).to.have.length(4);
    expect(
      memberList.functions.filter(each => each.localeCompare(original) === 0)
        .length
    ).to.equal(0);
    expect(
      memberList.functions.filter(each => each.localeCompare(replaceTo) === 0)
        .length
    ).to.equal(2);
  });

  it('test replaceAll with single occurence of an element', () => {
    const memberList: MemberList = {
      functions: ['aFunc', 'aFunc', 'bFunc', 'cFunc'],
      classes: ['aClass', 'bClass', 'aClass', 'cClass'],
      variables: ['aVar', 'bVar', 'cVar', 'aVar'],
      enums: ['aEnum', 'bEnum', 'cEnum', 'dEnum'],
      externals: []
    };
    const replaceTo: string = 'replacedClass';
    const original: string = 'bClass';
    replaceAll(memberList, original, replaceTo);
    expect(memberList.classes).to.not.include.members([original]);
    expect(memberList.classes).to.include.members([replaceTo]);
    expect(memberList.classes).to.have.length(4);
    expect(
      memberList.classes.filter(each => each.localeCompare(original) === 0)
        .length
    ).to.equal(0);
    expect(
      memberList.classes.filter(each => each.localeCompare(replaceTo) === 0)
        .length
    ).to.equal(1);
  });

  it('test replaceAll with zero occurence of an element', () => {
    const memberList: MemberList = {
      functions: ['aFunc', 'aFunc', 'bFunc', 'cFunc'],
      classes: ['aClass', 'bClass', 'aClass', 'cClass'],
      variables: ['aVar', 'bVar', 'cVar', 'aVar'],
      enums: ['aEnum', 'bEnum', 'cEnum', 'dEnum'],
      externals: []
    };
    const replaceTo: string = 'replacedEnum';
    const original: string = 'eEnum';
    replaceAll(memberList, original, replaceTo);
    expect(memberList.enums).to.not.include.members([original, replaceTo]);
    expect(memberList.enums).to.have.length(4);
    expect(
      memberList.enums.filter(each => each.localeCompare(original) === 0).length
    ).to.equal(0);
    expect(
      memberList.enums.filter(each => each.localeCompare(replaceTo) === 0)
        .length
    ).to.equal(0);
  });
});

describe('test mapSymbolToType helper function', () => {
  it('test if function correctly categorizes symbols that are misplaced', () => {
    let memberList: MemberList = {
      functions: ['aVar', 'bFunc', 'cFunc'],
      classes: ['bClass', 'cClass'],
      variables: ['aClass', 'bVar', 'cVar', 'aEnum'],
      enums: ['bEnum', 'cEnum', 'dEnum', 'aFunc'],
      externals: []
    };

    const map: Map<string, string> = new Map([
      ['aFunc', 'functions'],
      ['bFunc', 'functions'],
      ['aClass', 'classes'],
      ['bClass', 'classes'],
      ['aVar', 'variables'],
      ['bVar', 'variables'],
      ['aEnum', 'enums']
    ]);

    memberList = mapSymbolToType(map, memberList);

    expect(memberList.functions).to.have.members(['aFunc', 'bFunc', 'cFunc']);
    expect(memberList.functions).to.not.include.members(['aVar']);
    expect(memberList.classes).to.have.members(['aClass', 'bClass', 'cClass']);
    expect(memberList.variables).to.not.include.members(['aClass', 'aEnum']);
    expect(memberList.variables).to.have.members(['aVar', 'bVar', 'cVar']);
    expect(memberList.enums).to.have.members([
      'aEnum',
      'bEnum',
      'cEnum',
      'dEnum'
    ]);
    expect(memberList.enums).to.not.include.members(['aFunc']);

    expect(memberList.functions).to.have.length(3);
    expect(memberList.classes).to.have.length(3);
    expect(memberList.variables).to.have.length(3);
    expect(memberList.enums).to.have.length(4);
  });
});

describe('test writeReportToFile helper function', () => {
  it('should throw error when given path exists and points to directory', () => {
    const aDir = resolve('./a-dir/a-sub-dir');
    fs.mkdirSync(aDir, { recursive: true });
    expect(() => writeReportToFile('content', aDir)).to.throw(
      ErrorCode.OUTPUT_FILE_REQUIRED
    );
  });

  it('should not throw error when given path does not pre-exist', () => {
    const aPathToFile = resolve('./a-dir/a-sub-dir/a-file');
    expect(() => writeReportToFile('content', aPathToFile)).to.not.throw();
    fs.unlinkSync(aPathToFile);
  });
  after(() => {
    fs.rmdirSync('a-dir/a-sub-dir');
    fs.rmdirSync('a-dir', { recursive: true });
  });
});

describe('test writeReportToDirectory helper function', () => {
  it('should throw error when given path exists and points to a file', () => {
    const aDir = resolve('./a-dir/a-sub-dir');
    fs.mkdirSync(aDir, { recursive: true });
    const aFile = `a-file`;
    const aPathToFile = `${aDir}/${aFile}`;
    fs.writeFileSync(aPathToFile, 'content');
    expect(() =>
      writeReportToDirectory('content', aFile, aPathToFile)
    ).to.throw(ErrorCode.OUTPUT_DIRECTORY_REQUIRED);
  });

  it('should not throw error when given path does not pre-exist', () => {
    const aDir = resolve('./a-dir/a-sub-dir');
    const aFile = `a-file`;
    expect(() => writeReportToDirectory('content', aFile, aDir)).to.not.throw();
  });
  after(() => {
    fs.unlinkSync(`${resolve('./a-dir/a-sub-dir')}/a-file`);
    fs.rmdirSync('a-dir/a-sub-dir');
    fs.rmdirSync('a-dir', { recursive: true });
  });
});

describe('test extractExternalDependencies helper function', () => {
  it('should correctly extract all symbols listed in import statements', () => {
    const assortedImports: string = getAssortedImportsJsFilePath();
    const externals: External[] = extractExternalDependencies(assortedImports);
    const barFilter: External[] = externals.filter(
      each => each.moduleName.localeCompare("'./bar'") === 0
    );
    expect(barFilter.length).to.equal(1);
    expect(barFilter[0].symbols).to.have.members([
      'basicFuncExternalDependenciesBar',
      'basicFuncExportEnumDependenciesBar',
      'BasicClassExportBar' // extract original name if renamed
    ]);
    const loggerFilter: External[] = externals.filter(
      each => each.moduleName.localeCompare("'@firebase/logger'") === 0
    );
    expect(loggerFilter.length).to.equal(0);

    const fsFilter: External[] = externals.filter(
      each => each.moduleName.localeCompare("'fs'") === 0
    );
    expect(fsFilter.length).to.equal(1);
    expect(fsFilter[0].symbols).to.have.members(['*']); // namespace export

    const defaultExportFilter: External[] = externals.filter(
      each => each.moduleName.localeCompare("'@firebase/app'") === 0
    );
    expect(defaultExportFilter.length).to.equal(1);
    expect(defaultExportFilter[0].symbols).to.have.members(['default export']); // default export
  });
});
