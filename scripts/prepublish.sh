#!/bin/bash

set -e

# Determine if this is a production push or not
STAGING=true
while test $# -gt 0; do
  case "$1" in
    -p|--prod)
      STAGING=false
      shift
      ;;
    *)
      break
      ;;
  esac
done

# Get the current file directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT="$(cd $DIR/.. && pwd)"

# Add our `npm bin` to the PATH
export PATH="$(npm bin):$PATH";

rebuild_sdk() {
  git clean -xdf
  yarn
}

# Update Package Versions
case $STAGING in
  (true)    
    lerna publish --skip-npm --skip-git --scope @firebase/* --scope firebase
    rebuild_sdk
    pushd "$ROOT/packages/firebase"
    npm pack
    mv *.tgz "$ROOT"
    ;;
  (false)   
    lerna publish --skip-npm --scope @firebase/* --scope firebase
    rebuild_sdk
    ;;
  (*) 
    echo "STAGING variable improperly set"
    exit 1
    ;;
esac
