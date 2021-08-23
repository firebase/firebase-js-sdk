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

"use strict";var __spreadArray=this&&this.__spreadArray||function(to,from){for(var i=0,il=from.length,j=to.length;i<il;i++,j++)to[j]=from[i];return to};exports.__esModule=true;var fs=require("fs");var path=require("path");prepareTest();function prepareTest(){var compatSrcDir=path.join(__dirname,"../../firestore-compat/src");var compatSrcDest=path.join(__dirname,"../compat");copyDir(compatSrcDir,compatSrcDest);traverseDirAndUpdateImportPath(compatSrcDest,0)}function traverseDirAndUpdateImportPath(dir,level){var files=fs.readdirSync(dir);for(var _i=0,files_1=files;_i<files_1.length;_i++){var file=files_1[_i];var curSource=path.join(dir,file);if(fs.lstatSync(curSource).isDirectory()){traverseDirAndUpdateImportPath(curSource,level+1)}else{updateImportPath(curSource,level)}}}function updateImportPath(filePath,level){var FIRESTORE_IMPORT="'@firebase/firestore'";var BASE_IMPORT_PATH="../src/api";var newImportPath="'"+__spreadArray(__spreadArray([],Array(level).fill("..")),[BASE_IMPORT_PATH]).join("/")+"'";var content=fs.readFileSync(filePath,{encoding:"utf8"});var modifierContent=content.replace(FIRESTORE_IMPORT,newImportPath);fs.writeFileSync(filePath,modifierContent)}function copyDir(srcDir,destDir){if(!fs.existsSync(destDir)){fs.mkdirSync(destDir)}var files=fs.readdirSync(srcDir);for(var _i=0,files_2=files;_i<files_2.length;_i++){var file=files_2[_i];var curSource=path.join(srcDir,file);if(fs.lstatSync(curSource).isDirectory()){copyDir(curSource,path.join(destDir,file))}else{fs.copyFileSync(curSource,path.join(destDir,file))}}}
