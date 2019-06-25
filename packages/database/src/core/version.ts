/** The semver (www.semver.org) version of the SDK. */
export let SDK_VERSION = '';

// SDK_VERSION should be set before any database instance is created
export function setSDKVersion(version: string): void {
  SDK_VERSION = version;
}
