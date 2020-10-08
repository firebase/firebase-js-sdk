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

/**
 * A script to generate JSON files of the spec tests so that they can be run on
 * non-JavaScript platforms. Run it like this:
 *
 * usage: ./generate_spec_json.sh path/to/output
 *
 * It would be nice if this allowed relative paths, but when run by blaze,
 * it gets run with a strange cwd.
 */
var glob = require('glob');
var fs = require('fs');
var mkdirp = require('mkdirp');

const describeSpec = require('./specs/describe_spec');

/**
 * Write the spec test at the given path as a JSON file.
 * @param {string} testFile The JavaScript file containing the spec test.
 * @param {string} jsonFile The path to write the JSON to.
 */
function writeToJSON(testFile, jsonFile) {
  // Tell the test framework to write to a file instead of running.
  describeSpec.setSpecJSONHandler(json => {
    const fd = fs.openSync(jsonFile, 'w');
    fs.writeSync(fd, json + '\n', 0, 'utf-8');
  });
  require('./' + testFile);
}

/**
 * The main function for this script.
 * @param {array} args The command line arguments.
 */
function main(args) {
  if (args.length !== 3) {
    console.error('usage: ./generate_spec_json.sh path/to/output');
    return;
  }
  outputPath = args[2];
  mkdirp.sync(outputPath);

  const testFiles = glob.sync('**/specs/*_spec.test.ts', { cwd: __dirname });
  if (testFiles.length === 0) {
    throw new Error('No test files found');
  }
  for (var i = 0; i < testFiles.length; ++i) {
    var specName = testFiles[i].replace(/\.ts$/, '');
    var testName = specName.replace(/^specs\//, '');
    var filename = testName.replace(/[^A-Za-z\d]/g, '_') + '.json';
    var outputFile = outputPath + '/' + filename;
    console.log('Generating ' + outputFile);
    writeToJSON(testFiles[i], outputFile);
  }

  console.log('JSON spec files successfully generated to:', outputPath);
}

main(process.argv);
