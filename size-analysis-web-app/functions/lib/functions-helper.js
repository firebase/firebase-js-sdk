"use strict";
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path_1 = require("path");
const rollup_1 = require("rollup");
const rollup_plugin_node_resolve_1 = __importDefault(require("rollup-plugin-node-resolve"));
const rollup_plugin_commonjs_1 = __importDefault(require("rollup-plugin-commonjs"));
const terser_1 = require("terser");
const analysis_helper_1 = require("./analysis-helper");
const gzip_size_1 = require("gzip-size");
exports.pkgName = 'firebase';
const userSelectedSymbolFile = 'selected-symbols.js';
exports.userSelectedSymbolsBundleFile = 'selected-symbols-bundle.js';
exports.packageInstalledDirectory = 'tmp-folder-size-analysis-web-app';
exports.pkgRoot = `${exports.packageInstalledDirectory}/node_modules/${exports.pkgName}`;
/**
 *
 * This function extracts all symbols exported by the module.
 *
 */
async function generateExportedSymbolsListForModule(moduleLocation) {
    const packageJsonPath = `${moduleLocation}/package.json`;
    if (!fs.existsSync(packageJsonPath)) {
        return null;
    }
    const packageJson = require(packageJsonPath);
    // to exclude <modules>-types modules
    if (packageJson.typings) {
        const dtsFile = `${moduleLocation}/${packageJson.typings}`;
        const exportedSymbolsList = analysis_helper_1.extractDeclarations(dtsFile, null);
        const module = {
            moduleName: packageJson.name,
            symbols: exportedSymbolsList
        };
        return module;
    }
    return null;
}
exports.generateExportedSymbolsListForModule = generateExportedSymbolsListForModule;
/**
 * A recursive function that locates and generates exported symbol lists for the module and its sub-modules
 */
async function traverseDirs(moduleLocation, executor, level, levelLimit) {
    if (level > levelLimit) {
        return null;
    }
    const modules = [];
    const module = await executor(moduleLocation);
    if (module !== null) {
        modules.push(module);
    }
    for (const name of fs.readdirSync(moduleLocation)) {
        const p = `${moduleLocation}/${name}`;
        if (fs.lstatSync(p).isDirectory()) {
            const subModules = await traverseDirs(p, executor, level + 1, levelLimit);
            if (subModules !== null && subModules.length !== 0) {
                modules.push(...subModules);
            }
        }
    }
    return modules;
}
exports.traverseDirs = traverseDirs;
/**
 *
 * This function extracts exported symbols from every module of the given list.
 *
 */
async function generateExportedSymbolsListForModules(moduleLocations) {
    const modules = [];
    for (const moduleLocation of moduleLocations) {
        // we traverse the dir in order to include binaries for submodules, e.g. @firebase/firestore/memory
        // Currently we only traverse 1 level deep because we don't have any submodule deeper than that.
        const moduleAndSubModules = await traverseDirs(moduleLocation, generateExportedSymbolsListForModule, 0, 1);
        if (moduleAndSubModules !== null && moduleAndSubModules.length !== 0) {
            modules.push(...moduleAndSubModules);
        }
    }
    return modules;
}
exports.generateExportedSymbolsListForModules = generateExportedSymbolsListForModules;
/**
 * This functions creates a package.json file programatically and installs the firebase package.
 */
function setUpPackageEnvironment(firebaseVersionToBeInstalled) {
    try {
        if (!fs.existsSync(exports.packageInstalledDirectory)) {
            fs.mkdirSync(exports.packageInstalledDirectory);
        }
        const packageJsonContent = `{\"name\":\"size-analysis-firebase\",\"version\":\"0.1.0\",\"dependencies\":{\"typescript\":\"3.8.3\",\"${exports.pkgName}\":\"${firebaseVersionToBeInstalled}\"}}`;
        fs.writeFileSync(`${exports.packageInstalledDirectory}/package.json`, packageJsonContent);
        child_process_1.execSync(`cd ${exports.packageInstalledDirectory}; npm install; cd ..`);
    }
    catch (error) {
        throw new Error(error);
    }
}
exports.setUpPackageEnvironment = setUpPackageEnvironment;
/**
 * This function generates a bundle file from the given export statements.
 * @param userSelectedSymbolsFileContent JavaScript export statements that consume user selected symbols
 * @returns the generate bundle file content
 */
async function generateBundleFileGivenCustomJsFile(userSelectedSymbolsJsFileContent) {
    try {
        const absolutePathToUserSelectedSymbolsBundleFile = path_1.resolve(`${exports.packageInstalledDirectory}/${exports.userSelectedSymbolsBundleFile}`);
        const absolutePathToUserSelectedSymbolsJsFile = path_1.resolve(`${exports.packageInstalledDirectory}/${userSelectedSymbolFile}`);
        fs.writeFileSync(absolutePathToUserSelectedSymbolsJsFile, userSelectedSymbolsJsFileContent);
        const bundle = await rollup_1.rollup({
            input: absolutePathToUserSelectedSymbolsJsFile,
            plugins: [
                rollup_plugin_node_resolve_1.default({
                    mainFields: ['esm2017', 'module', 'main']
                }),
                rollup_plugin_commonjs_1.default()
            ]
        });
        const { output } = await bundle.generate({ format: 'es' });
        await bundle.write({
            file: absolutePathToUserSelectedSymbolsBundleFile,
            format: 'es'
        });
        return output[0].code;
    }
    catch (error) {
        throw new Error(error);
    }
}
exports.generateBundleFileGivenCustomJsFile = generateBundleFileGivenCustomJsFile;
/**
 * This function calculates both the binary size of the original bundle file and the size of the gzippzed version.
 * The calculation is done after code minimization of the bundle file.
 * @param bundleFileContent the content/code of the js bundle file
 *
 */
function calculateBinarySizeGivenBundleFile(bundleFileContent) {
    const bundleFileContentMinified = terser_1.minify(bundleFileContent, {
        output: {
            comments: false
        },
        mangle: true,
        compress: false
    });
    return [
        Buffer.byteLength(bundleFileContentMinified.code, 'utf-8'),
        gzip_size_1.sync(bundleFileContentMinified.code)
    ];
}
exports.calculateBinarySizeGivenBundleFile = calculateBinarySizeGivenBundleFile;
/**
 * This function programatically creates JS export statements for symbols listed in userSelectedSymbols
 *
 */
function buildJsFileGivenUserSelectedSymbols(userSelectedSymbols) {
    const statements = [];
    for (const userSelectedSymbol of userSelectedSymbols) {
        let statement = '';
        const selectedSymbols = userSelectedSymbol.symbols;
        for (const selectedSymbolsOfType of Object.values(selectedSymbols)) {
            if (Array.isArray(selectedSymbolsOfType) &&
                selectedSymbolsOfType.length > 0) {
                selectedSymbolsOfType.forEach(selectedSymbolOfType => {
                    statement += `${selectedSymbolOfType}, `;
                });
            }
            else {
                continue;
            }
        }
        if (statement.length == 0) {
            continue;
        }
        statement = 'export { ' + statement;
        statement = statement.trimRight();
        statement = statement.substring(0, statement.length - 1);
        statement += `} from \'@firebase/${path_1.basename(userSelectedSymbol.moduleName)}\';`;
        statements.push(statement);
    }
    return statements.join('\n');
}
exports.buildJsFileGivenUserSelectedSymbols = buildJsFileGivenUserSelectedSymbols;
/**
 * This functions returns a list of module(under firebase scope) locations.
 */
function retrieveAllModuleLocation() {
    const moduleLocations = [];
    try {
        const pkgRootAbsolutedPath = path_1.resolve(`${exports.pkgRoot}`);
        const pkgJson = require(`${pkgRootAbsolutedPath}/package.json`);
        const components = pkgJson.components;
        for (const component of components) {
            moduleLocations.push(`${pkgRootAbsolutedPath}/${component}`);
        }
        return moduleLocations;
    }
    catch (error) {
        throw new Error(error);
    }
}
exports.retrieveAllModuleLocation = retrieveAllModuleLocation;
//# sourceMappingURL=functions-helper.js.map