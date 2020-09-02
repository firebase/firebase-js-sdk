import { expect } from 'chai';

import { ConfigInternal } from '../../model/auth';
import { _emulatorUrl } from './emulator';

describe('core/util/emulator', () => {
  const config: ConfigInternal = {
    emulator: {
      hostname: 'localhost',
      port: 4000
    }
  } as ConfigInternal;

  it('builds the proper URL with no path', () => {
    expect(_emulatorUrl(config)).to.eq('http://localhost:4000');
  });

  it('builds the proper URL with a path', () => {
    expect(_emulatorUrl(config, '/test/path')).to.eq('http://localhost:4000/test/path');
  });

  it('builds the proper URL with a path missing separator', () => {
    expect(_emulatorUrl(config, 'test/path')).to.eq('http://localhost:4000/test/path');
  });
});