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

set -ev

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
  echo "Deleting temp working directory $WORK_DIR"
  rm -rf "$WORK_DIR"
  echo "Killing child processes"
  pkill -P $$
}

# register the cleanup function to be called on the EXIT signal
trap cleanup EXIT

# Validate that we have the necessary configs
[ -z "$FIREBASE_TOKEN" ] && { echo "Environment variable FIREBASE_TOKEN not set"; exit 1; }
[ -z "$FIREBASE_PROJECT" ] && { echo "Environment variable FIREBASE_PROJECT not set"; exit 1; }

# Enter work dir
pushd "$WORK_DIR"

if [ ! -d "$ROOT/dist/package" ]; then
  pushd $ROOT
  $GULP_CLI build
  popd
fi

# Simulate env
cp -r $DIR/* .
npm install
npm install "$ROOT/dist/package"

# Mount the new SDK
./node_modules/.bin/serve ./node_modules/firebase -p 5000 &

startFirebaseServer() {
  # Capture variables
  local DIR="$1"
  local PORT="$2"

  # Enter the passed directory
  pushd $DIR

  # Start firebase server
  "$WORK_DIR/node_modules/.bin/firebase" use --add $FIREBASE_PROJECT --token $FIREBASE_TOKEN
  "$WORK_DIR/node_modules/.bin/firebase" serve -p $PORT &
  
  popd
}

# Enter temp dir
pushd $(mktemp -d)

# Clone https://github.com/firebase/quickstart-js
git clone https://github.com/firebase/quickstart-js.git .

# Edit the source to point to our new binaries
if [ "$(uname)" == "Darwin" ]; then
  sed -i '.bak' 's/\/__\/firebase\/3.9.0/http:\/\/localhost:5000/g' **/*.html
else
  sed -i 's/\/__\/firebase\/3.9.0/http:\/\/localhost:5000/g' **/*.html
fi

# Start servers
startFirebaseServer storage 5001
startFirebaseServer database 5002

# Go back to firebase-js-sdk
popd

# Give the servers a few seconds to spin up
sleep 10

# Exec tests
"$WORK_DIR/node_modules/webdriverio/bin/wdio"
