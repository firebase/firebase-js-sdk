import { ConfigInternal } from '../../model/auth';
import { debugAssert } from './assert';

export function _emulatorUrl(config: ConfigInternal, path?: string): string {
  debugAssert(config.emulator, 'Emulator should always be set here');
  const {hostname, port} = config.emulator;

  const base = `http://${hostname}:${port}`;
  if (!path) {
    return base;
  }

  const sep = path.startsWith('/') ? '' : '/';
  return `${base}${sep}${path}`;
}