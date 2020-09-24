#!/usr/bin/env ts-node-script
/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as yargs from 'yargs';
import { runPrerelease } from './prerelease';
import { runRelease } from './release';
import { bannerText } from './utils/banner';

/**
 * Welcome to the firebase release CLI!
 */
bannerText();

yargs
  .command(
    '$0',
    'Make a prod or staging release',
    {
      skipReinstall: {
        type: 'boolean',
        default: false
      },
      skipTests: {
        type: 'boolean',
        default: false
      },
      ignoreUnstaged: {
        type: 'boolean',
        default: false
      },
      releaseType: {
        type: 'string'
      },
      dryRun: {
        type: 'boolean',
        default: false
      }
    },
    argv => runRelease(argv)
  )
  .command(
    'canary',
    'make a canary release',
    {
      dryRun: {
        type: 'boolean',
        default: false
      }
    },
    argv =>
      runPrerelease({
        prereleaseName: 'canary',
        npmTag: 'canary',
        dryRun: argv.dryRun
      })
  )
  .command(
    'custom',
    'make a custom prerelease',
    {
      prereleaseName: {
        type: 'string',
        alias: 'p',
        demandOption: true,
        desc:
          'The prerelease label used in verison number. e.g. 1.0.0-<prereleaseName>'
      },
      npmTag: {
        type: 'string',
        alias: 't',
        demandOption: true,
        desc:
          'The npm tag the packages are published to. e.g. npm install firebase@<npmTag>'
      },
      dryRun: {
        type: 'boolean',
        default: false
      }
    },
    argv => runPrerelease(argv)
  )
  .demandCommand()
  .help().argv;
