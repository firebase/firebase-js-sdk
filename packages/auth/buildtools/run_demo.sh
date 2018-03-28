#!/bin/bash
# Copyright 2017 Google Inc. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS-IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Runs the server for the demo page.
#
# Usage:
# $ buildtools/run_demo.sh

# CD to the root packages/auth directory, which should be the parent directory of
# buildtools/.
cd "$(dirname $(dirname "$0"))"
# Go back to repo root and build all binaries needed for the demo app.
cd ../..
yarn prepare
# Go back to Auth package.
cd packages/auth
# Make dist directory if not already there.
mkdir -p demo/public/dist
# Copy app, auth and database binaries to demo dist directory.
cp ../firebase/firebase-app.js demo/public/dist/firebase-app.js
cp ../firebase/firebase-auth.js demo/public/dist/firebase-auth.js
cp ../firebase/firebase-database.js demo/public/dist/firebase-database.js
# Serve demo app.
cd demo
`yarn bin`/firebase serve --only hosting,functions
