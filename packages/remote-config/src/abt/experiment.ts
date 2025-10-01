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
import { Storage } from '../storage/storage';
import { FirebaseExperimentDescription } from '../public_types';
import { Provider } from '@firebase/component';
import { FirebaseAnalyticsInternalName } from '@firebase/analytics-interop-types';
import { Logger } from '@firebase/logger';

export class Experiment {
  constructor(
    private readonly storage: Storage,
    private readonly logger: Logger,
    private readonly analyticsProvider: Provider<FirebaseAnalyticsInternalName>
  ) {}

  async updateActiveExperiments(
    latestExperiments: FirebaseExperimentDescription[]
  ): Promise<void> {
    const currentActiveExperiments =
      (await this.storage.getActiveExperiments()) || new Set<string>();
    const experimentInfoMap = this.createExperimentInfoMap(latestExperiments);
    this.addActiveExperiments(currentActiveExperiments, experimentInfoMap);
    this.removeInactiveExperiments(currentActiveExperiments, experimentInfoMap);
    return this.storage.setActiveExperiments(new Set(experimentInfoMap.keys()));
  }

  private createExperimentInfoMap(
    latestExperiments: FirebaseExperimentDescription[]
  ): Map<string, FirebaseExperimentDescription> {
    const experimentInfoMap = new Map<string, FirebaseExperimentDescription>();
    for (const experiment of latestExperiments) {
      experimentInfoMap.set(experiment.experimentId, experiment);
    }
    return experimentInfoMap;
  }

  private addActiveExperiments(
    currentActiveExperiments: Set<string>,
    experimentInfoMap: Map<string, FirebaseExperimentDescription>
  ): void {
    const customProperty: Record<string, string | null> = {};
    for (const [experimentId, experimentInfo] of experimentInfoMap.entries()) {
      if (!currentActiveExperiments.has(experimentId)) {
        customProperty[experimentId] = experimentInfo.variantId;
      }
    }
    void this.addExperimentToAnalytics(customProperty);
  }

  private removeInactiveExperiments(
    currentActiveExperiments: Set<string>,
    experimentInfoMap: Map<string, FirebaseExperimentDescription>
  ): void {
    const customProperty: Record<string, string | null> = {};
    for (const experimentId of currentActiveExperiments) {
      if (!experimentInfoMap.has(experimentId)) {
        customProperty[experimentId] = null;
      }
    }
    void this.addExperimentToAnalytics(customProperty);
  }

  private async addExperimentToAnalytics(
    customProperty: Record<string, string | null>
  ): Promise<void> {
    try {
      const analytics = this.analyticsProvider.getImmediate({ optional: true });
      if (analytics) {
        analytics.setUserProperties({ properties: customProperty });
      } else {
        this.logger.warn(`Analytics is not imported correctly`);
      }
    } catch (error) {
      this.logger.error(`Failed to add experiment to analytics : ${error}`);
      return;
    }
  }
}
