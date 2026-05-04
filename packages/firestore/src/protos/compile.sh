#!/bin/bash

# Copyright 2026 Google Inc.
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

# Verify dependencies
for cmd in npx find; do
  if ! command -v "$cmd" &> /dev/null; then
    echo "Error: $cmd is required but not installed." >&2
    exit 1
  fi
done

PROTOS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROTO_FILES=$(find "${PROTOS_DIR}/google" -name "*.proto")

# Generate JSON representation
npx pbjs --path="${PROTOS_DIR}" --target=json -o "${PROTOS_DIR}/protos.json" \
  -r firestore/v1 $PROTO_FILES

rm -f "${PROTOS_DIR}/temp.d.ts"
