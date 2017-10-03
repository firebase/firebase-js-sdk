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

set -o nounset
set -o errexit

# Variables
ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
GULP_CLI="$ROOT/node_modules/.bin/gulp"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WORK_DIR=`mktemp -d`

# check if tmp dir was created
if [[ ! "$WORK_DIR" || ! -d "$WORK_DIR" ]]; then
  echo "Could not create temp dir"
  exit 1
fi

# deletes the temp directory
function cleanup {
  rm -rf "$WORK_DIR"
  echo "Deleted temp working directory $WORK_DIR"
}

# register the cleanup function to be called on the EXIT signal
trap cleanup EXIT

# Enter work dir
pushd "$WORK_DIR"

pushd $ROOT
$GULP_CLI build
popd

# Simulate env
cp -r $DIR/* .
npm install
npm install "$ROOT/dist/package"

# Copy tests and support code.
mkdir -p tests/firestore/integration
cp -r $ROOT/tests/firestore/integration/api tests/firestore/integration/api
cp -r $ROOT/tests/firestore/integration/util tests/firestore/integration/util
cp -r $ROOT/tests/firestore/util tests/firestore/util
mkdir -p tests/config
cp $ROOT/tests/config/project.json tests/config/

# TODO(b/66946692): This is awkward. We should probably rework things so our
# integration tests don't depend on product code.
cp -r $ROOT/src src
cp -r $ROOT/typings-internal typings-internal

cp firebase_export.ts tests/firestore/integration/util/
# Fake test that hijacks Promise to make sure we don't break IE support.
# TODO(mikelehen): Remove this once we have cross-browser testing in place.
cp hijack-promise.test.ts tests/firestore/

# Run the tests (this compiles the tests)
./node_modules/.bin/karma start
