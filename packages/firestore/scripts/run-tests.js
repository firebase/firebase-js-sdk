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
 */Object.defineProperty(exports,"__esModule",{value:true});var path_1=require("path");var child_process_promise_1=require("child-process-promise");var yargs=require("yargs");var argv=yargs.options({main:{type:"string",demandOption:true},platform:{type:"string",default:"node"},emulator:{type:"boolean"},persistence:{type:"boolean"},databaseId:{type:"string"},firestoreEdition:{type:"string"},grep:{type:"string",description:"Filter tests by name (regex)"},targetBackend:{type:"string",description:"The backend to test against (emulator, prod, nightly)"},debug:{type:"boolean",description:"Run tests in debug mode (node --inspect-brk)"}}).parseSync();var vitest=(0,path_1.resolve)(__dirname,"../../../node_modules/.bin/vitest");process.env.TEST_PLATFORM=argv.platform;if(argv.targetBackend){process.env.FIRESTORE_TARGET_BACKEND=argv.targetBackend}if(argv.emulator){process.env.FIRESTORE_TARGET_BACKEND="emulator"}if(argv.persistence){process.env.USE_MOCK_PERSISTENCE="YES"}if(argv.databaseId){process.env.FIRESTORE_TARGET_DB_ID=argv.databaseId}if(argv.firestoreEdition){if(argv.firestoreEdition.toLowerCase()==="enterprise"){process.env.RUN_ENTERPRISE_TESTS="true"}}var executable=vitest;var args=["run","--project=node"];if(argv.debug){executable="node";var vitestMjs=(0,path_1.resolve)(__dirname,"../../../node_modules/vitest/vitest.mjs");args=["--inspect-brk",vitestMjs,"--project=node","--no-file-parallelism"]}if(argv.grep){args.push("-t",argv.grep)}var fileArgs=argv._.filter((function(pattern){return!pattern.includes("{,!(browser|lite)")}));args=args.concat(fileArgs);var spawnPromise=(0,child_process_promise_1.spawn)(executable,args,{stdio:"inherit",cwd:process.cwd()});var childProcess=spawnPromise.childProcess;spawnPromise.catch((function(error){if(typeof error.code==="number"&&error.code>0){process.exit(error.code)}else{console.error("Test runner failed to execute:");console.error(error);process.exit(1)}}));process.once("exit",(function(){return childProcess.kill()}));process.once("SIGINT",(function(){return childProcess.kill("SIGINT")}));process.once("SIGTERM",(function(){return childProcess.kill("SIGTERM")}));