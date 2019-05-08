#!/bin/bash

# Copyright 2017 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# generate_spec_json --- Generate json spec files from sources.

set -o nounset
set -o errexit

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NPM_BIN_DIR="$(npm bin)"
TSNODE="$NPM_BIN_DIR/ts-node"
GENERATE_SPEC_JS="$DIR/generate_spec_json.js"

export TS_NODE_CACHE=NO 
export TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}' 
export TS_NODE_PROJECT="$DIR/../../tsconfig.json"

$TSNODE $GENERATE_SPEC_JS "$@"
