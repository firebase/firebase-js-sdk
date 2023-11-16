/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */

import {
  EVENT_MESSAGE_DELIVERED,
  MessageType,
  SDK_PLATFORM_WEB
} from '../../util/constants';
import {
  FcmEvent,
  LogEvent,
  LogResponse,
  UserResponse,
  ComplianceData
} from '../../interfaces/logging-types';

export function getFakeLogEvent(): LogEvent {
  return {
    /* eslint-disable camelcase */
    event_time_ms: '0',
    source_extension_json_proto3: JSON.stringify(getFakeFcmEvent()),
    compliance_data: getFakeComplianceData()
    /* eslint-enable camelcase */
  };
}

function getFakeFcmEvent(): FcmEvent {
  return {
    /* eslint-disable camelcase */
    project_number: '1234',
    message_id: 'fake-mid',
    instance_id: 'fake-fid',
    message_type: MessageType.DISPLAY_NOTIFICATION.toString(),
    sdk_platform: SDK_PLATFORM_WEB.toString(),
    package_name: 'fake-package-name',
    collapse_key: 'fake-collapse-key',
    event: EVENT_MESSAGE_DELIVERED.toString(),
    analytics_label: 'fake-analytics-label'
    /* eslint-enable camelcase */
  };
}

function getFakeComplianceData(): ComplianceData {
  const fakeComplianceData: ComplianceData = {
    /* eslint-disable camelcase */
    privacy_context: {
      prequest: {
        origin_associated_product_id: 123
      }
    }
    /* eslint-enable camelcase */
  };

  return fakeComplianceData;
}

export function getSuccessResponse(): LogResponse {
  return Object.create({
    nextRequestWaitMillis: 1000,
    logResponseDetails: [{ responseAction: UserResponse.DELETE_REQUEST }]
  });
}

export function getFailedResponse(): LogResponse {
  return {
    nextRequestWaitMillis: 1000,
    logResponseDetails: [{ responseAction: UserResponse.DELETE_REQUEST }]
  };
}
