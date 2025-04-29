/**
 * Checks whether host is a cloud workstation or not.
 */
export function isCloudWorkstation(host: string) {
    return host.endsWith('.cloudworkstations.dev');
}