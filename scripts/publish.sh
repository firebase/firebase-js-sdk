#!/bin/bash

set -e

# Get the current file directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Add our `npm bin` to the PATH
export PATH="$(npm bin):$PATH";

# Run the publish script in each directory
lerna exec --scope @firebase/* --scope firebase -- $DIR/try-publish
