#!/bin/bash
# Copyright 2018 Google Inc. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS-IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Run SauceLabs browsers tests for directly affected packages in the current
# git branch.

BASE_BRANCH=origin/master

cat << EOL
Diffstat of branch [$TRAVIS_BRANCH] compared to [$BASE_BRANCH]:
$(git diff $BASE_BRANCH...$TRAVIS_BRANCH --stat --color=always)
EOL

changed_files=$(git diff $BASE_BRANCH...$TRAVIS_BRANCH --name-only)
packages=($(echo -e "${changed_files}" \
  | sed -nE 's%(^(packages|integration)/[^/]*)/.*%\1%p' \
  | sort -u))

if [[ ${#packages[@]} -ne 0 ]]; then
  echo "Affected packages in branch [$TRAVIS_BRANCH]: ${packages[@]}."
  echo "Starting SauceLabs test ..."
  yarn test:saucelabs --packages ${packages[@]}
else
  echo "No package affected. Skipped SauceLabs test."
fi
