#!/bin/bash

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

if [ ! -d "$ROOT/dist/package" ]; then
  pushd $ROOT
  $GULP_CLI build
  popd
fi

# Simulate env
cp $DIR/* .
cp $DIR/../shared/* .
npm install
npm install "$ROOT/dist/package"

# Build the new env
./node_modules/.bin/webpack

# Run the tests
./node_modules/.bin/karma start
