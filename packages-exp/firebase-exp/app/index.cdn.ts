import { registerVersion } from '@firebase/app-exp';
import { name, version } from '../package.json';

registerVersion(name, version, 'cdn');
export * from '@firebase/app-exp';
