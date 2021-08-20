/**
 * @license
 * Copyright 2021 Google LLC
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

import * as fs from 'fs';
import * as path from 'path';

prepareTest();

function prepareTest(): void {
    // copy compat source code to ./compat
    const compatSrcDir = path.join(__dirname, '../../firestore-compat/src');
    const compatSrcDest = path.join(__dirname, '../compat');
    copyDir(compatSrcDir, compatSrcDest);

    // change import path from @firebase/firestore to source file location in compat source code copied earlier
    traverseDirAndUpdateImportPath(compatSrcDest, 0);
}

/**
 * 
 * @param dir - the dir to traverse
 * @param level - the depth of the traversal at this point, starting from 0.
 */
function traverseDirAndUpdateImportPath(dir: string, level: number): void {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const curSource = path.join(dir, file);
        if (fs.lstatSync(curSource).isDirectory()) {
            // copy dir recursively
            traverseDirAndUpdateImportPath(curSource, level + 1);
        } else {
            // do something about the file
            updateImportPath(curSource, level);
        }
    }
}

/**
 * 
 * @param filePath - the path to the file to update
 * @param level - the number of ".." to prepend to the import path
 */
function updateImportPath(filePath: string, level: number): void {
    const FIRESTORE_IMPORT = '\'@firebase/firestore\'';
    const BASE_IMPORT_PATH = '../src/api';
    const newImportPath = `'${[...Array(level).fill('..'), BASE_IMPORT_PATH].join('/')}'`;
    const content = fs.readFileSync(filePath, { encoding: 'utf8' });
    const modifierContent = content.replace(FIRESTORE_IMPORT, newImportPath);

    fs.writeFileSync(filePath, modifierContent);
}

function copyDir(srcDir: string, destDir: string): void {

    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir);
    }

    const files = fs.readdirSync(srcDir);
    for (const file of files) {
        const curSource = path.join(srcDir, file);
        if (fs.lstatSync(curSource).isDirectory()) {
            // copy dir recursively
            copyDir(curSource, path.join(destDir, file));
        } else {
            // copy file
            fs.copyFileSync(curSource, path.join(destDir, file));
        }
    }
}