import * as fs from 'fs';
import * as path from 'path';

prepareTest();

function prepareTest() {
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
function traverseDirAndUpdateImportPath(dir: string, level: number) {
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
function updateImportPath(filePath: string, level: number) {
    const FIRESTORE_IMPORT = '\'@firebase/firestore\'';
    const BASE_IMPORT_PATH = '../src/api';
    const newImportPath = `'${[...Array(level).fill('..'), BASE_IMPORT_PATH].join('/')}'`;
    const content = fs.readFileSync(filePath, { encoding: 'utf8' });
    console.log(FIRESTORE_IMPORT, newImportPath)
    const modifierContent = content.replace(FIRESTORE_IMPORT, newImportPath)
    console.log(content);
    console.log("################################");
    console.log(modifierContent);
    fs.writeFileSync(filePath, modifierContent);
}

function copyDir(srcDir: string, destDir: string) {

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