/**
 * @license
 * Copyright 2025 Google LLC
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
import '../setup';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Experiment } from '../../src/abt/experiment';
import { FirebaseExperimentDescription } from '../../src/public_types';
import { Storage } from '../../src/storage/storage';

describe('Experiment', () => {
  const storage = {} as Storage;
  const experiment = new Experiment(storage);

  describe('updateActiveExperiments', () => {
    beforeEach(() => {
      storage.getActiveExperiments = sinon.stub();
      storage.setActiveExperiments = sinon.stub();
    });

    it('adds mew experiments to storage', async () => {
      const latestExperiments: FirebaseExperimentDescription[] = [
        {
          experimentId: '_exp_3',
          variantId: '1',
          experimentStartTime: '0',
          triggerTimeoutMillis: '0',
          timeToLiveMillis: '0'
        },
        {
          experimentId: '_exp_1',
          variantId: '2',
          experimentStartTime: '0',
          triggerTimeoutMillis: '0',
          timeToLiveMillis: '0'
        },
        {
          experimentId: '_exp_2',
          variantId: '1',
          experimentStartTime: '0',
          triggerTimeoutMillis: '0',
          timeToLiveMillis: '0'
        }
      ];
      const expectedStoredExperiments = new Set(['_exp_3', '_exp_1', '_exp_2']);
      storage.getActiveExperiments = sinon
        .stub()
        .returns(new Set(['_exp_1', '_exp_2']));

      await experiment.updateActiveExperiments(latestExperiments);

      expect(storage.setActiveExperiments).to.have.been.calledWith(
        expectedStoredExperiments
      );
    });

    it('removes missing experiment in fetch response from storage', async () => {
      const latestExperiments: FirebaseExperimentDescription[] = [
        {
          experimentId: '_exp_1',
          variantId: '2',
          experimentStartTime: '0',
          triggerTimeoutMillis: '0',
          timeToLiveMillis: '0'
        }
      ];
      const expectedStoredExperiments = new Set(['_exp_1']);
      storage.getActiveExperiments = sinon
        .stub()
        .returns(new Set(['_exp_1', '_exp_2']));

      await experiment.updateActiveExperiments(latestExperiments);

      expect(storage.setActiveExperiments).to.have.been.calledWith(
        expectedStoredExperiments
      );
    });
  });
});
