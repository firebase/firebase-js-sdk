#!/bin/bash

set -e

# pwd
PACKAGE=$(node -p "require('./package.json').name")
VERSION=$(node -p "require('./package.json').version")
PUBLISHED=$(npm info $PACKAGE version)

if [[ "$VERSION" = "$PUBLISHED" ]]; then
  echo "⚠️   $PACKAGE@$VERSION is already published!"
else
  echo "📦  Publishing: $PACKAGE@$VERSION (published: $PUBLISHED)"
  npm publish $@
fi
