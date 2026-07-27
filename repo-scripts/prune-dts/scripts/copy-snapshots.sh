#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
TESTS_DIR="$REPO_ROOT/repo-scripts/prune-dts/tests/packages"

echo "Copying baseline snapshots to tests/packages..."

cp "$REPO_ROOT/packages/firestore/dist/index.d.ts" "$TESTS_DIR/firestore.output.d.ts"
cp "$REPO_ROOT/packages/firestore/dist/pipelines.d.ts" "$TESTS_DIR/firestore-pipelines.output.d.ts"
cp "$REPO_ROOT/packages/data-connect/dist/public.d.ts" "$TESTS_DIR/data-connect.output.d.ts"
cp "$REPO_ROOT/packages/database/dist/public.d.ts" "$TESTS_DIR/database.output.d.ts"
cp "$REPO_ROOT/packages/messaging/dist/index-public.d.ts" "$TESTS_DIR/messaging.output.d.ts"

echo "Done copying baseline snapshots."
