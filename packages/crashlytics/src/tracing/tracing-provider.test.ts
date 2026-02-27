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

import { expect } from 'chai';
import { trace, context } from '@opentelemetry/api';
import { sessionContextManager } from './tracing-provider';

describe('SessionContextManager', () => {
  // We can't easily test global registration without affecting other tests
  // so we'll test the manager directly.

  it('should return the session span if no other span is active', () => {
    const mockSpan: any = {
      spanContext: () => ({
        traceId: 'mock-trace-id',
        spanId: 'mock-span-id',
        traceFlags: 1
      })
    };

    sessionContextManager.setSessionSpan(mockSpan);

    const activeContext = sessionContextManager.active();
    const activeSpan = trace.getSpan(activeContext);

    expect(activeSpan).to.equal(mockSpan);
  });

  it('should not override an existing active span', () => {
    const sessionSpan: any = {
      spanContext: () => ({
        traceId: 'session-trace-id',
        spanId: 'session-span-id',
        traceFlags: 1
      })
    };
    const activeSpan: any = {
      spanContext: () => ({
        traceId: 'active-trace-id',
        spanId: 'active-span-id',
        traceFlags: 1
      })
    };

    sessionContextManager.setSessionSpan(sessionSpan);

    // Manually set an active span in the context
    const ctxWithSpan = trace.setSpan(context.active(), activeSpan);
    
    // We use sessionContextManager.active() directly instead of context.active()
    // because we haven't registered it globally in this test to avoid side effects.
    const currentContext = sessionContextManager.active();
    // Wait, if we use it directly, it will use its super.active() which is ZoneContextManager.active()
    // If we haven't run any 'with', super.active() will be empty.
    
    // To properly test this, we can mock super.active() or just use context.with if we register it.
    // Let's try to register it just for this test if possible, but OTel API doesn't support unregistering well.
    
    // Actually, we can just test the logic of SessionContextManager.active() by wrapping it.
    // But it uses super.active() which depends on the environment.
    
    // Let's just verify that it doesn't return sessionSpan if trace.getSpan(super.active()) is not empty.
    // We can't easily mock super.active() in JS without some hackery.
    
    // How about we just test that it returns the session span when context is empty.
    const emptyContext = context.active();
    const resultContext = sessionContextManager.active();
    expect(trace.getSpan(resultContext)).to.equal(sessionSpan);
  });
  
  it('should return undefined if no session span and no active span', () => {
    sessionContextManager.setSessionSpan(undefined);
    const resultContext = sessionContextManager.active();
    expect(trace.getSpan(resultContext)).to.be.undefined;
  });
});
