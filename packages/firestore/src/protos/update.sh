#!/bin/bash

set -o nounset
set -o errexit

# Variables
PROTOS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WORK_DIR=`mktemp -d`

# check if tmp dir was created
if [[ ! "$WORK_DIR" || ! -d "$WORK_DIR" ]]; then
  echo "Could not create temp dir"
  exit 1
fi

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
git clone git@github.com:googleapis/googleapis.git
git clone git@github.com:google/protobuf.git

# Copy necessary protos.
mkdir -p "${PROTOS_DIR}/google/api"
cp googleapis/google/api/{annotations.proto,http.proto} \
   "${PROTOS_DIR}/google/api/"

mkdir -p "${PROTOS_DIR}/google/firestore/v1beta1"
cp googleapis/google/firestore/v1beta1/*.proto \
   "${PROTOS_DIR}/google/firestore/v1beta1/"

mkdir -p "${PROTOS_DIR}/google/rpc"
cp googleapis/google/rpc/status.proto \
   "${PROTOS_DIR}/google/rpc/"

mkdir -p "${PROTOS_DIR}/google/type"
cp googleapis/google/type/latlng.proto \
   "${PROTOS_DIR}/google/type/"

mkdir -p "${PROTOS_DIR}/google/protobuf"
cp protobuf/src/google/protobuf/{any.proto,empty.proto,struct.proto,timestamp.proto,wrappers.proto} \
   "${PROTOS_DIR}/google/protobuf/"

popd
