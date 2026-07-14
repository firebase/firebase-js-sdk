#!/usr/bin/env bash
set -e

# 0. Setup directories and trap exit
BASELINE_DIR="/tmp/prune-dts-baseline"
CURRENT_DIR="/tmp/prune-dts-current"
rm -rf "$BASELINE_DIR" "$CURRENT_DIR"
mkdir -p "$BASELINE_DIR" "$CURRENT_DIR"

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Starting .d.ts comparison from current branch: $CURRENT_BRANCH"

cleanup() {
  echo "Restoring original branch: $CURRENT_BRANCH..."
  git checkout "$CURRENT_BRANCH" --quiet
}
trap cleanup EXIT

copy_bundle_dts() {
  local target_dir="$1"
  echo "  -> Copying firestore.d.ts"
  cp packages/firestore/dist/index.d.ts "$target_dir/firestore.d.ts"
  echo "  -> Copying firestore-lite.d.ts"
  cp packages/firestore/dist/lite/index.d.ts "$target_dir/firestore-lite.d.ts"
  echo "  -> Copying firestore-pipelines.d.ts"
  cp packages/firestore/dist/pipelines.d.ts "$target_dir/firestore-pipelines.d.ts"
  echo "  -> Copying firestore-lite-pipelines.d.ts"
  cp packages/firestore/dist/lite/pipelines.d.ts "$target_dir/firestore-lite-pipelines.d.ts"
  echo "  -> Copying data-connect.d.ts"
  cp packages/data-connect/dist/public.d.ts "$target_dir/data-connect.d.ts"
  echo "  -> Copying messaging.d.ts"
  cp packages/messaging/dist/index-public.d.ts "$target_dir/messaging.d.ts"
  echo "  -> Copying messaging-sw.d.ts"
  cp packages/messaging/dist/sw/index-public.d.ts "$target_dir/messaging-sw.d.ts"
  echo "  -> Copying database.d.ts"
  cp packages/database/dist/public.d.ts "$target_dir/database.d.ts"
  echo "  -> Copying storage.d.ts"
  cp packages/storage/dist/storage-public.d.ts "$target_dir/storage.d.ts"
}

# 1. Baseline build on main
echo "[1/4] Checking out main branch..."
git checkout main --quiet

echo "[2/4] Building SDK on main (logs redirected to /tmp/prune-dts-build-main.log)..."
# yarn build > /tmp/prune-dts-build-main.log 2>&1
yarn build --skip-nx-cache
echo "Copying baseline .d.ts files to $BASELINE_DIR..."
copy_bundle_dts "$BASELINE_DIR"

# 2. Build on current branch
echo "[3/4] Checking out $CURRENT_BRANCH..."
git checkout "$CURRENT_BRANCH" --quiet

echo "[4/4] Building SDK on $CURRENT_BRANCH (logs redirected to /tmp/prune-dts-build-current.log)..."
# yarn build > /tmp/prune-dts-build-current.log 2>&1
yarn build --skip-nx-cache
echo "Copying new .d.ts files to $CURRENT_DIR..."
copy_bundle_dts "$CURRENT_DIR"

# 3. Output comparison command
echo ""
echo "========================================================================"
echo "Comparison baseline and current .d.ts files have been stored successfully."
echo "Run the following command to view the diff without whitespace/blank-line noise:"
echo ""
echo "  git diff --no-index -w --ignore-blank-lines $BASELINE_DIR $CURRENT_DIR"
echo "========================================================================"
