#!/bin/bash

set -e

# Get the current file directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT="$(cd $DIR/.. && pwd)"

# Add our `npm bin` to the PATH
export PATH="$(npm bin):$PATH";

# Update Package Versions
lerna publish --skip-npm --scope @firebase/* --scope firebase

# Rebuild SDK
git clean -xdf
yarn
