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

set -euo pipefail
IFS=$'\n\t'

# Variables
PROTOS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WORK_DIR=`mktemp -d`
PBJS="$(pwd)/../../node_modules/.bin/pbjs"
PBTS="$(pwd)/../../node_modules/.bin/pbts"

# deletes the temp directory on exit
function cleanup {
  rm -rf "$WORK_DIR"
  echo "Deleted temp working directory $WORK_DIR"
}

# register the cleanup function to be called on the EXIT signal
trap cleanup EXIT

# Enter work dir
pushd "$WORK_DIR"

# Clone necessary git repos.
git clone --depth 1 https://github.com/googleapis/googleapis.git
git clone --depth 1 https://github.com/google/protobuf.git

# Copy necessary protos.
mkdir -p "${PROTOS_DIR}/google/api"
cp googleapis/google/api/{annotations.proto,http.proto,client.proto,field_behavior.proto,launch_stage.proto} \
   "${PROTOS_DIR}/google/api/"

mkdir -p "${PROTOS_DIR}/google/firestore/v1"
cp googleapis/google/firestore/v1/*.proto \
   "${PROTOS_DIR}/google/firestore/v1/"

mkdir -p "${PROTOS_DIR}/google/rpc"
cp googleapis/google/rpc/status.proto \
   "${PROTOS_DIR}/google/rpc/"

mkdir -p "${PROTOS_DIR}/google/type"
cp googleapis/google/type/latlng.proto \
   "${PROTOS_DIR}/google/type/"

# Hack in `verify` support
ex "${PROTOS_DIR}/google/firestore/v1/write.proto" <<eof
44 insert
    // The name of a document on which to verify the \`current_document\`
    // precondition.
    // This only requires read access to the document.
    string verify = 5;

.
xit
eof

"${PBJS}" --path="${PROTOS_DIR}" --target=json -o protos.json \
  -r firestore/v1 "${PROTOS_DIR}/google/firestore/v1/*.proto" \
  "${PROTOS_DIR}/google/protobuf/*.proto" "${PROTOS_DIR}/google/type/*.proto" \
  "${PROTOS_DIR}/google/rpc/*.proto" "${PROTOS_DIR}/google/api/*.proto"

"${PBJS}" --path="${PROTOS_DIR}" --target=static -o temp.js \
  -r firestore/v1 "${PROTOS_DIR}/google/firestore/v1/*.proto" \
  "${PROTOS_DIR}/google/protobuf/*.proto" "${PROTOS_DIR}/google/type/*.proto" \
  "${PROTOS_DIR}/google/rpc/*.proto" "${PROTOS_DIR}/google/api/*.proto"

"${PBTS}" -o temp.d.ts --no-comments temp.js

cp protos.json "${PROTOS_DIR}/protos.json"
cp temp.js "${PROTOS_DIR}/temp.js"
cp temp.d.ts "${PROTOS_DIR}/temp.d.js"
