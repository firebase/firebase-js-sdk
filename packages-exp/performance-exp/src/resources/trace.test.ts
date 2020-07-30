/**
 * @license
 * Copyright 2019 Google LLC
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

import '../../test/setup';

import { expect } from 'chai';
import { restore, spy, stub } from 'sinon';

import { Trace } from '../resources/trace';
import { Api, setupApi } from '../services/api_service';
import * as perfLogger from '../services/perf_logger';

describe('Firebase Performance > trace', () => {
  setupApi(window);
  let trace: Trace;
  const createTrace = (): Trace => {
    return new Trace('test');
  };

  beforeEach(() => {
    spy(Api.prototype, 'mark');
    stub(perfLogger, 'logTrace');
    trace = createTrace();
  });

  afterEach(() => {
    restore();
  });

  describe('#start', () => {
    beforeEach(() => {
      trace.start();
    });

    it('uses the underlying api method', () => {
      expect(Api.getInstance().mark).to.be.calledOnce;
    });

    it('throws if a trace is started twice', () => {
      expect(() => trace.start()).to.throw();
    });
  });

  describe('#stop', () => {
    it('adds a mark to the performance timeline', () => {
      trace.start();
      trace.stop();

      expect(Api.getInstance().mark).to.be.calledTwice;
    });

    it('logs the trace', () => {
      trace.start();
      trace.stop();

      expect((perfLogger.logTrace as any).calledOnceWith(trace)).to.be.true;
    });
  });

  describe('#record', () => {
    it('logs a trace without metrics or custom attributes', () => {
      trace.record(1, 20);

      expect((perfLogger.logTrace as any).calledOnceWith(trace)).to.be.true;
    });

    it('logs a trace with metrics', () => {
      trace.record(1, 20, { metrics: { cacheHits: 1 } });

      expect((perfLogger.logTrace as any).calledOnceWith(trace)).to.be.true;
      expect(trace.getMetric('cacheHits')).to.eql(1);
    });

    it('logs a trace with custom attributes', () => {
      trace.record(1, 20, { attributes: { level: '1' } });

      expect((perfLogger.logTrace as any).calledOnceWith(trace)).to.be.true;
      expect(trace.getAttributes()).to.eql({ level: '1' });
    });

    it('logs a trace with custom attributes and metrics', () => {
      trace.record(1, 20, {
        attributes: { level: '1' },
        metrics: { cacheHits: 1 }
      });

      expect((perfLogger.logTrace as any).calledOnceWith(trace)).to.be.true;
      expect(trace.getAttributes()).to.eql({ level: '1' });
      expect(trace.getMetric('cacheHits')).to.eql(1);
    });
  });

  describe('#incrementMetric', () => {
    it('creates new metric if one doesnt exist.', () => {
      trace.incrementMetric('cacheHits', 200);

      expect(trace.getMetric('cacheHits')).to.eql(200);
    });

    it('increments metric if it already exists.', () => {
      trace.incrementMetric('cacheHits', 200);
      trace.incrementMetric('cacheHits', 400);

      expect(trace.getMetric('cacheHits')).to.eql(600);
    });

    it('increments metric value as an integer even if the value is provided in float.', () => {
      trace.incrementMetric('cacheHits', 200);
      trace.incrementMetric('cacheHits', 400.38);

      expect(trace.getMetric('cacheHits')).to.eql(600);
    });

    it('increments metric value with a negative float.', () => {
      trace.incrementMetric('cacheHits', 200);
      trace.incrementMetric('cacheHits', -230.38);

      expect(trace.getMetric('cacheHits')).to.eql(-31);
    });

    it('throws error if metric doesnt exist and has invalid name', () => {
      expect(() => trace.incrementMetric('_invalidMetric', 1)).to.throw();
    });
  });

  describe('#putMetric', () => {
    it('creates new metric if one doesnt exist and has valid name.', () => {
      trace.putMetric('cacheHits', 200);

      expect(trace.getMetric('cacheHits')).to.eql(200);
    });

    it('sets the metric value as an integer even if the value is provided in float.', () => {
      trace.putMetric('timelapse', 200.48);

      expect(trace.getMetric('timelapse')).to.eql(200);
    });

    it('replaces metric if it already exists.', () => {
      trace.putMetric('cacheHits', 200);
      trace.putMetric('cacheHits', 400);

      expect(trace.getMetric('cacheHits')).to.eql(400);
    });

    it('throws error if metric doesnt exist and has invalid name', () => {
      expect(() => trace.putMetric('_invalidMetric', 1)).to.throw();
      expect(() => trace.putMetric('_fid', 1)).to.throw();
    });
  });

  describe('#getMetric', () => {
    it('returns 0 if metric doesnt exist', () => {
      expect(trace.getMetric('doesThisExist')).to.equal(0);
    });

    it('returns 0 if it exists and equals 0', () => {
      trace.putMetric('cacheHits', 0);

      expect(trace.getMetric('cacheHits')).to.equal(0);
    });

    it('returns metric if it exists', () => {
      trace.putMetric('cacheHits', 200);

      expect(trace.getMetric('cacheHits')).to.equal(200);
    });

    it('returns multiple metrics if they exist', () => {
      trace.putMetric('cacheHits', 200);
      trace.putMetric('bytesDownloaded', 25);

      expect(trace.getMetric('cacheHits')).to.equal(200);
      expect(trace.getMetric('bytesDownloaded')).to.equal(25);
    });
  });

  describe('#putAttribute', () => {
    it('creates new attribute if it doesnt exist', () => {
      trace.putAttribute('level', '4');

      expect(trace.getAttributes()).to.eql({ level: '4' });
    });

    it('replaces attribute if it exists', () => {
      trace.putAttribute('level', '4');
      trace.putAttribute('level', '7');

      expect(trace.getAttributes()).to.eql({ level: '7' });
    });

    it('throws error if attribute name is invalid', () => {
      expect(() => trace.putAttribute('_invalidAttribute', '1')).to.throw();
    });

    it('throws error if attribute value is invalid', () => {
      const longAttributeValue =
        'too-long-attribute-value-over-one-hundred-characters-too-long-attribute-value-over-one-' +
        'hundred-charac';
      expect(() =>
        trace.putAttribute('validName', longAttributeValue)
      ).to.throw();
    });
  });

  describe('#getAttribute', () => {
    it('returns undefined for attribute that doesnt exist', () => {
      expect(trace.getAttribute('level')).to.be.undefined;
    });

    it('returns attribute if it exists', () => {
      trace.putAttribute('level', '4');
      expect(trace.getAttribute('level')).to.equal('4');
    });

    it('returns separate attributes if they exist', () => {
      trace.putAttribute('level', '4');
      trace.putAttribute('stage', 'beginning');

      expect(trace.getAttribute('level')).to.equal('4');
      expect(trace.getAttribute('stage')).to.equal('beginning');
    });
  });

  describe('#removeAttribute', () => {
    it('does not throw if removing attribute that doesnt exist', () => {
      expect(() => trace.removeAttribute('doesNotExist')).to.not.throw;
    });

    it('removes attribute if it exists', () => {
      trace.putAttribute('level', '4');
      expect(trace.getAttribute('level')).to.equal('4');

      trace.removeAttribute('level');
      expect(trace.getAttribute('level')).to.be.undefined;
    });

    it('retains other attributes', () => {
      trace.putAttribute('level', '4');
      trace.putAttribute('stage', 'beginning');

      trace.removeAttribute('level');
      expect(trace.getAttribute('level')).to.be.undefined;
      expect(trace.getAttribute('stage')).to.equal('beginning');
    });
  });
});
