#!/bin/bash

set -e

# pwd
PACKAGE=$(npm info . name)
VERSION=$(npm info . version)
PUBLISHED=$(npm info $PACKAGE version)

if [[ "$VERSION" = "$PUBLISHED" ]]; then
  echo "⚠️   $PACKAGE@$VERSION is already published!"
else
  echo "📦  Publishing: $PACKAGE@$VERSION (published: $PUBLISHED)"
  npm publish $@
fi
