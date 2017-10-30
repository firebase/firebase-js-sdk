#!/bin/bash
# Copyright 2016 Google Inc. All Rights Reserved.
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

#
# Download and install SauceConnect under Linux 64-bit. To be used when testing
# with SauceLabs locally. See the instructions in protractor.conf.js file.
#
# It should not be used on Travis. Travis already handles SauceConnect.
#
# Script copied from the Closure Library repository:
# https://github.com/google/closure-library/blob/master/scripts/ci/sauce_connect.sh
#

# Setup and start Sauce Connect locally.
CONNECT_URL="https://saucelabs.com/downloads/sc-4.4.1-linux.tar.gz"
CONNECT_DIR="/tmp/sauce-connect-$RANDOM"
CONNECT_DOWNLOAD="sc-latest-linux.tar.gz"

BROWSER_PROVIDER_READY_FILE="/tmp/sauce-connect-ready"

# Get Connect and start it.
mkdir -p $CONNECT_DIR
cd $CONNECT_DIR
curl $CONNECT_URL -o $CONNECT_DOWNLOAD 2> /dev/null 1> /dev/null
mkdir sauce-connect
tar --extract --file=$CONNECT_DOWNLOAD --strip-components=1 \
    --directory=sauce-connect > /dev/null
rm $CONNECT_DOWNLOAD

function removeFiles() {
  echo "Removing SauceConnect files..."
  rm -rf $CONNECT_DIR
}

trap removeFiles EXIT

# This will be used by Protractor to connect to SauceConnect.
TUNNEL_IDENTIFIER="tunnelId-$RANDOM"
echo ""
echo "========================================================================="
echo "    Tunnel Identifier to pass to Protractor:"
echo "    $TUNNEL_IDENTIFIER"
echo "========================================================================="
echo ""
echo ""

echo "Starting Sauce Connect..."

# Start SauceConnect.
sauce-connect/bin/sc -u $SAUCE_USERNAME -k $SAUCE_ACCESS_KEY \
    -i $TUNNEL_IDENTIFIER
