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

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  MemberList,
  dedup,
  mapSymbolToType,
  replaceAll,
  writeReportToFile,
  ErrorCode,
  writeReportToDirectory,
  extractExternalDependencies,
  Report,
  extractExports,
  extractAllTopLevelSymbols
} from '../analysis-helper';

import {
  getTestModuleDtsFilePath,
  getAssortedImportsJsFilePath,
  getSubsetExportsBundleFilePath
} from './utils';
import * as fs from 'fs';
import { resolve } from 'path';

describe('extractExports', () => {
  let testModuleDtsFile: string;
  let extractedDeclarations: MemberList;
  beforeAll(() => {
    const start = Date.now();
    testModuleDtsFile = getTestModuleDtsFilePath();
    extractedDeclarations = extractExports(testModuleDtsFile);
    console.log('extractExports took ', Date.now() - start);
  });
  // export {tar as tarr, tar1 as tarr1} from '..'
  it('test export rename', () => {
    expect(extractedDeclarations.functions).toEqual(
      expect.arrayContaining(['tarr', 'tarr1'])
    );
  });
  // function foo() { }
  // export { foo as foo2 };
  it('test declare then export', () => {
    expect(extractedDeclarations.functions).toEqual(
      expect.arrayContaining(['foo2'])
    );
    expect(extractedDeclarations.classes).toEqual(
      expect.arrayContaining(['Foo1'])
    );
  });

  it('test basic variable extractions', () => {
    expect(extractedDeclarations.variables).toEqual(
      expect.arrayContaining([
        'basicVarDeclarationExport',
        'basicVarStatementExport',
        'reExportVarStatementExport'
      ])
    );
  });
  it('test re-exported variable extractions from same module - named re-exports', () => {
    expect(extractedDeclarations.variables).toEqual(
      expect.arrayContaining([
        'basicVarDeclarationExportFar',
        'basicVarStatementExportFar',
        'reExportVarStatementExportFar'
      ])
    );
  });
  it('test re-exported variable extractions from same module - * re-exports', () => {
    expect(extractedDeclarations.variables).toEqual(
      expect.arrayContaining([
        'basicVarDeclarationExportBar',
        'basicVarStatementExportBar',
        'reExportVarStatementExportBar'
      ])
    );
  });

  it('test basic function extractions', () => {
    expect(extractedDeclarations.functions).toEqual(
      expect.arrayContaining([
        'basicFuncExportNoDependencies',
        'basicFuncExportVarDependencies',
        'basicFuncExportFuncDependencies',
        'basicFuncExportEnumDependencies',
        'basicFuncExternalDependencies'
      ])
    );
  });
  it('test basic function de-duplication ', () => {
    expect(extractedDeclarations.functions).toEqual(
      expect.arrayContaining(['basicUniqueFunc'])
    );

    expect(
      extractedDeclarations.functions.filter(
        each => each.localeCompare('basicUniqueFunc') === 0
      ).length
    ).toBe(1);
  });

  it('test re-exported function extractions from same module - named re-exports', () => {
    expect(extractedDeclarations.functions).toEqual(
      expect.arrayContaining([
        'basicFuncExportNoDependenciesFar',
        'basicFuncExportVarDependenciesFar',
        'basicFuncExportFuncDependenciesFar',
        'basicFuncExportEnumDependenciesFar',
        'basicFuncExternalDependenciesFar'
      ])
    );
  });

  it('test re-exported function extractions from same module - * re-exports', () => {
    expect(extractedDeclarations.functions).toEqual(
      expect.arrayContaining([
        'basicFuncExportNoDependenciesBar',
        'basicFuncExportVarDependenciesBar',
        'basicFuncExportFuncDependenciesBar',
        'basicFuncExportEnumDependenciesBar',
        'basicFuncExternalDependenciesBar'
      ])
    );
  });

  it('test re-exported function de-duplication from same module ', () => {
    expect(extractedDeclarations.functions).toEqual(
      expect.arrayContaining(['basicUniqueFuncFar'])
    );

    expect(
      extractedDeclarations.functions.filter(
        each => each.localeCompare('basicUniqueFuncFar') === 0
      ).length
    ).toBe(1);
  });

  it('test basic class extractions', () => {
    expect(extractedDeclarations.classes).toEqual(
      expect.arrayContaining(['BasicClassExport'])
    );
  });

  it('test re-exported class extractions from same module - named re-exports', () => {
    expect(extractedDeclarations.classes).toEqual(
      expect.arrayContaining(['BasicClassExportFar'])
    );
  });
  it('test re-exported class extractions from same module - * re-exports', () => {
    expect(extractedDeclarations.classes).toEqual(
      expect.arrayContaining(['BasicClassExportBar'])
    );
  });

  it('test basic enum extractions', () => {
    expect(extractedDeclarations.enums).toEqual(
      expect.arrayContaining(['BasicEnumExport'])
    );
  });

  it('test re-exported enum extractions from same module - named re-exports', () => {
    expect(extractedDeclarations.enums).toEqual(
      expect.arrayContaining(['BasicEnumExportFar'])
    );
  });
  it('test re-exported enum extractions from same module - * re-exports', () => {
    expect(extractedDeclarations.enums).toEqual(
      expect.arrayContaining(['BasicEnumExportBar'])
    );
  });
  // import {LogLevel as LogLevel1} from '@firebase/logger';
  // export {LogLevel1 as LogLevel2};
  it('test renamed import then renamed export', () => {
    expect(extractedDeclarations.enums).toEqual(
      expect.arrayContaining(['LogLevel2'])
    );
  });

  //import { Logger } from "@firebase/logger";
  // export { Logger as Logger1 };
  it('test import then renamed export', () => {
    expect(extractedDeclarations.classes).toEqual(
      expect.arrayContaining(['Logger1'])
    );
  });

  //import { setLogLevel } from "@firebase/logger";
  // export { setLogLevel };
  it('test import then export', () => {
    expect(extractedDeclarations.functions).toEqual(
      expect.arrayContaining(['setLogLevel'])
    );
  });

  // import * as fs from 'fs'
  // export { fs as fs1 };
  it('test namespace export', () => {
    expect(extractedDeclarations.unknown).toEqual(
      expect.arrayContaining(['fs1'])
    );
  });
});

describe('extractAllTopLevelSymbols', () => {
  let subsetExportsBundleFile: string;
  let extractedDeclarations: MemberList;
  beforeAll(() => {
    const start = Date.now();
    subsetExportsBundleFile = getSubsetExportsBundleFilePath();
    extractedDeclarations = extractAllTopLevelSymbols(subsetExportsBundleFile);
    console.log(
      'extractDeclarations on js bundle file took ',
      Date.now() - start
    );
  });
  it('test variable extractions', () => {
    const variablesArray = ['aVar'];
    variablesArray.sort();
    expect(extractedDeclarations.variables).toEqual(
      expect.arrayContaining(variablesArray)
    );
  });

  it('test functions extractions', () => {
    const functionsArray = [
      'tar',
      'tar1',
      'basicFuncExportEnumDependencies',
      'd1',
      'd2',
      'd3',
      'basicFuncExportFuncDependenciesBar'
    ];
    functionsArray.sort();
    expect(extractedDeclarations.functions).toEqual(
      expect.arrayContaining(functionsArray)
    );
    expect(extractedDeclarations.functions).toHaveLength(functionsArray.length);
  });

  it('test enums extractions', () => {
    const enumsArray = [
      'BasicEnumExport',
      'BasicEnumExportBar',
      'BasicEnumExportFar'
    ];
    enumsArray.sort();
    expect(extractedDeclarations.variables).toEqual(
      expect.arrayContaining(enumsArray)
    );
  });

  it('test classes extractions', () => {
    const classesArray = ['BasicClassExport'];
    classesArray.sort();
    expect(extractedDeclarations.classes).toEqual(
      expect.arrayContaining(classesArray)
    );
    expect(extractedDeclarations.classes).toHaveLength(classesArray.length);
  });
});

describe('test dedup helper function', () => {
  it('test dedup with non-empty entries', () => {
    let memberList: MemberList = {
      functions: ['aFunc', 'aFunc', 'bFunc', 'cFunc'],
      classes: ['aClass', 'bClass', 'aClass', 'cClass'],
      variables: ['aVar', 'bVar', 'cVar', 'aVar'],
      enums: ['aEnum', 'bEnum', 'cEnum', 'dEnum'],
      unknown: []
    };
    memberList = dedup(memberList);

    expect(memberList.functions).toHaveLength(3);
    expect(memberList.classes).toHaveLength(3);
    expect(memberList.variables).toHaveLength(3);
    expect(memberList.enums).toHaveLength(4);
    expect(
      memberList.functions.filter(each => each.localeCompare('aFunc') === 0)
        .length
    ).toBe(1);
    expect(
      memberList.classes.filter(each => each.localeCompare('aClass') === 0)
        .length
    ).toBe(1);
    expect(
      memberList.variables.filter(each => each.localeCompare('aVar') === 0)
        .length
    ).toBe(1);
    expect(
      memberList.enums.filter(each => each.localeCompare('aEnum') === 0).length
    ).toBe(1);
  });

  it('test dedup with empty entries', () => {
    let memberList: MemberList = {
      functions: [],
      classes: [],
      variables: ['aVar', 'bVar', 'cVar', 'aVar'],
      enums: [],
      unknown: []
    };
    memberList = dedup(memberList);
    expect(memberList.functions).toHaveLength(0);
    expect(memberList.classes).toHaveLength(0);
    expect(memberList.enums).toHaveLength(0);
    expect(memberList.variables).toHaveLength(3);

    expect(
      memberList.variables.filter(each => each.localeCompare('aVar') === 0)
        .length
    ).toBe(1);
  });
});

describe('test replaceAll helper function', () => {
  it('test replaceAll with multiple occurrences of an element', () => {
    const memberList: MemberList = {
      functions: ['aFunc', 'aFunc', 'bFunc', 'cFunc'],
      classes: ['aClass', 'bClass', 'aClass', 'cClass'],
      variables: ['aVar', 'bVar', 'cVar', 'aVar'],
      enums: ['aEnum', 'bEnum', 'cEnum', 'dEnum'],
      unknown: []
    };
    const original: string = 'aFunc';
    const replaceTo: string = 'replacedFunc';
    replaceAll(memberList, original, replaceTo);
    expect(memberList.functions).not.toContain(original);
    expect(memberList.functions).toEqual(expect.arrayContaining([replaceTo]));
    expect(memberList.functions).toHaveLength(4);
    expect(
      memberList.functions.filter(each => each.localeCompare(original) === 0)
        .length
    ).toBe(0);
    expect(
      memberList.functions.filter(each => each.localeCompare(replaceTo) === 0)
        .length
    ).toBe(2);
  });

  it('test replaceAll with single occurrence of an element', () => {
    const memberList: MemberList = {
      functions: ['aFunc', 'aFunc', 'bFunc', 'cFunc'],
      classes: ['aClass', 'bClass', 'aClass', 'cClass'],
      variables: ['aVar', 'bVar', 'cVar', 'aVar'],
      enums: ['aEnum', 'bEnum', 'cEnum', 'dEnum'],
      unknown: []
    };
    const replaceTo: string = 'replacedClass';
    const original: string = 'bClass';
    replaceAll(memberList, original, replaceTo);
    expect(memberList.classes).not.toContain(original);
    expect(memberList.classes).toEqual(expect.arrayContaining([replaceTo]));
    expect(memberList.classes).toHaveLength(4);
    expect(
      memberList.classes.filter(each => each.localeCompare(original) === 0)
        .length
    ).toBe(0);
    expect(
      memberList.classes.filter(each => each.localeCompare(replaceTo) === 0)
        .length
    ).toBe(1);
  });

  it('test replaceAll with zero occurrence of an element', () => {
    const memberList: MemberList = {
      functions: ['aFunc', 'aFunc', 'bFunc', 'cFunc'],
      classes: ['aClass', 'bClass', 'aClass', 'cClass'],
      variables: ['aVar', 'bVar', 'cVar', 'aVar'],
      enums: ['aEnum', 'bEnum', 'cEnum', 'dEnum'],
      unknown: []
    };
    const replaceTo: string = 'replacedEnum';
    const original: string = 'eEnum';
    replaceAll(memberList, original, replaceTo);
    expect(memberList.enums).not.toContain(original);
    expect(memberList.enums).not.toContain(replaceTo);
    expect(memberList.enums).toHaveLength(4);
    expect(
      memberList.enums.filter(each => each.localeCompare(original) === 0).length
    ).toBe(0);
    expect(
      memberList.enums.filter(each => each.localeCompare(replaceTo) === 0)
        .length
    ).toBe(0);
  });
});

describe('test mapSymbolToType helper function', () => {
  it('test if function correctly categorizes symbols that are misplaced', () => {
    let memberList: MemberList = {
      functions: ['aVar', 'bFunc', 'cFunc'],
      classes: ['bClass', 'cClass'],
      variables: ['aClass', 'bVar', 'cVar', 'aEnum'],
      enums: ['bEnum', 'cEnum', 'dEnum', 'aFunc'],
      unknown: []
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

    expect(memberList.functions).toEqual(
      expect.arrayContaining(['aFunc', 'bFunc', 'cFunc'])
    );
    expect(memberList.functions).not.toContain('aVar');
    expect(memberList.classes).toEqual(
      expect.arrayContaining(['aClass', 'bClass', 'cClass'])
    );
    expect(memberList.variables).not.toContain('aClass');
    expect(memberList.variables).not.toContain('aEnum');
    expect(memberList.variables).toEqual(
      expect.arrayContaining(['aVar', 'bVar', 'cVar'])
    );
    expect(memberList.enums).toEqual(
      expect.arrayContaining(['aEnum', 'bEnum', 'cEnum', 'dEnum'])
    );
    expect(memberList.enums).not.toContain('aFunc');

    expect(memberList.functions).toHaveLength(3);
    expect(memberList.classes).toHaveLength(3);
    expect(memberList.variables).toHaveLength(3);
    expect(memberList.enums).toHaveLength(4);
  });
});

describe('test writeReportToFile helper function', () => {
  let fileContent: Report;

  beforeAll(() => {
    fileContent = {
      name: 'name',
      symbols: []
    };
  });
  it('should throw error when given path exists and points to directory', () => {
    const aDir = resolve('./a-dir/a-sub-dir');
    fs.mkdirSync(aDir, { recursive: true });
    expect(() => writeReportToFile(fileContent, aDir)).toThrow(
      ErrorCode.OUTPUT_FILE_REQUIRED
    );
  });

  it('should not throw error when given path does not pre-exist', () => {
    const aPathToFile = resolve('./a-dir/a-sub-dir/a-file');
    expect(() => writeReportToFile(fileContent, aPathToFile)).not.toThrow();
    fs.unlinkSync(aPathToFile);
  });
  afterAll(() => {
    fs.rmdirSync('a-dir/a-sub-dir');
    fs.rmdirSync('a-dir', { recursive: true });
  });
});

describe('test writeReportToDirectory helper function', () => {
  let fileContent: Report;

  beforeAll(() => {
    fileContent = {
      name: 'name',
      symbols: []
    };
  });
  it('should throw error when given path exists and points to a file', () => {
    const aDir = resolve('./a-dir/a-sub-dir');
    fs.mkdirSync(aDir, { recursive: true });
    const aFile = `a-file`;
    const aPathToFile = `${aDir}/${aFile}`;
    fs.writeFileSync(aPathToFile, JSON.stringify(fileContent));
    expect(() =>
      writeReportToDirectory(fileContent, aFile, aPathToFile)
    ).toThrow(ErrorCode.OUTPUT_DIRECTORY_REQUIRED);
  });

  it('should not throw error when given path does not pre-exist', () => {
    const aDir = resolve('./a-dir/a-sub-dir');
    const aFile = `a-file`;
    expect(() =>
      writeReportToDirectory(fileContent, aFile, aDir)
    ).not.toThrow();
  });
  afterAll(() => {
    fs.unlinkSync(`${resolve('./a-dir/a-sub-dir')}/a-file`);
    fs.rmdirSync('a-dir/a-sub-dir');
    fs.rmdirSync('a-dir', { recursive: true });
  });
});

describe('test extractExternalDependencies helper function', () => {
  it('should correctly extract all symbols listed in import statements', () => {
    const assortedImports: string = getAssortedImportsJsFilePath();
    const externals: { [key: string]: string[] } =
      extractExternalDependencies(assortedImports);

    expect(externals['./bar']).toEqual(
      expect.arrayContaining([
        'basicFuncExternalDependenciesBar',
        'basicFuncExportEnumDependenciesBar',
        'BasicClassExportBar' // extract original name if renamed
      ])
    );
    expect(externals['./bar']).toHaveLength(3);
    expect(externals['@firebase/logger']).toBeUndefined();
    expect(externals['fs']).toEqual(expect.arrayContaining(['*'])); // namespace export
    expect(externals['fs']).toHaveLength(1);
    // expect(externals['@firebase/app']).to.have.members(['default export']); // default export
  });
});
