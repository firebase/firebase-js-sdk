/**
 * @license
 * Copyright 2020 Google LLC
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

import { expect } from 'chai';
import { _getBrowserName, BrowserName } from './browser';

describe('core/util/_getBrowserName', () => {
  it('should recognize Opera', () => {
    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36 OPR/36.0.2130.74';
    expect(_getBrowserName(userAgent)).to.eq(BrowserName.OPERA);
  });

  it('should recognize IE', () => {
    const userAgent =
      'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C)';
    expect(_getBrowserName(userAgent)).to.eq(BrowserName.IE);
  });

  it('should recognize Edge', () => {
    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.10240';
    expect(_getBrowserName(userAgent)).to.eq(BrowserName.EDGE);
  });

  it('should recognize Firefox', () => {
    const userAgent =
      'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:46.0) Gecko/20100101 Firefox/46.0';
    expect(_getBrowserName(userAgent)).to.eq(BrowserName.FIREFOX);
  });

  it('should recognize Silk', () => {
    const userAgent =
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Silk/44.1.54 like Chrome/44.0.2403.63 Safari/537.36';
    expect(_getBrowserName(userAgent)).to.eq(BrowserName.SILK);
  });

  it('should recognize Safari', () => {
    const userAgent =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11-4) AppleWebKit/601.5.17 (KHTML, like Gecko) Version/9.1 Safari/601.5.17';
    expect(_getBrowserName(userAgent)).to.eq(BrowserName.SAFARI);
  });

  it('should recognize Chrome', () => {
    const userAgent =
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.94 Safari/537.36';
    expect(_getBrowserName(userAgent)).to.eq(BrowserName.CHROME);
  });

  it('should recognize Android', () => {
    const userAgent =
      'Mozilla/5.0 (Linux; U; Android 4.0.3; ko-kr; LG-L160L Build/IML74K) AppleWebkit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30';
    expect(_getBrowserName(userAgent)).to.eq(BrowserName.ANDROID);
  });

  it('should recognize Blackberry', () => {
    const userAgent =
      'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.1.0.346 Mobile Safari/534.11+';
    expect(_getBrowserName(userAgent)).to.eq(BrowserName.BLACKBERRY);
  });

  it('should recognize IE Mobile', () => {
    const userAgent =
      'Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0;Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 920)';
    expect(_getBrowserName(userAgent)).to.eq(BrowserName.IEMOBILE);
  });

  it('should recognize WebOS', () => {
    const userAgent =
      'Mozilla/5.0 (webOS/1.3; U; en-US) AppleWebKit/525.27.1 (KHTML, like Gecko) Version/1.0 Safari/525.27.1 Desktop/1.0';
    expect(_getBrowserName(userAgent)).to.eq(BrowserName.WEBOS);
  });

  it('should recognize an unlisted browser', () => {
    const userAgent =
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Awesome/2.0.012';
    expect(_getBrowserName(userAgent)).to.eq('Awesome');
  });

  it('should default to Other', () => {
    const userAgent =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 8_2 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Mobile/12D508 [FBAN/FBIOS;FBAV/27.0.0.10.12;FBBV/8291884;FBDV/iPhone7,1;FBMD/iPhone;FBSN/iPhone OS;FBSV/8.2;FBSS/3; FBCR/vodafoneIE;FBID/phone;FBLC/en_US;FBOP/5]';
    expect(_getBrowserName(userAgent)).to.eq(BrowserName.OTHER);
  });
});
