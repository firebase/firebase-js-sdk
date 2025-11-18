import * as constants from './constants/auto-constants';
import { Telemetry } from './public-types';
import { TelemetryService } from './service';

export function getAppVersion(telemetry: Telemetry): string {
  if ((telemetry as TelemetryService).options?.appVersion) {
    return (telemetry as TelemetryService).options!.appVersion!;
  } else if (constants.AUTO_APP_VERSION) {
    return constants.AUTO_APP_VERSION;
  }
  return 'unset';
}