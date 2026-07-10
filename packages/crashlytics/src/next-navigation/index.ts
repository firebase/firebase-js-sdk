/**
 * @license
 * Copyright 2026 Google LLC
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

import { FirebaseApp } from '@firebase/app';
import { registerCrashlytics } from '../register';
import { getCrashlytics, logViewBoundary } from '../api';
import { usePathname, useParams } from 'next/navigation';
import { useEffect } from 'react';
import { CrashlyticsInternal } from '../types';
import { CrashlyticsOptions } from '../public-types';

registerCrashlytics();

export * from '../public-types';

/**
 * Constructs a parameterized route template for Next.js App Router
 * by replacing dynamic parameter values in the pathname with parameter placeholders.
 *
 * @example
 * // pathname = "/users/123/details", params = { id: "123" }
 * // returns "/users/:id/details"
 *
 * @internal
 */
export function getParameterizedRoute(
  pathname: string | null,
  params: Record<string, string | string[] | undefined> | null
): string {
  if (!pathname) {
    return '/';
  }
  if (!params || Object.keys(params).length === 0) {
    return pathname;
  }

  let routePattern = pathname;

  for (const [key, value] of Object.entries(params)) {
    if (!value) {
      continue;
    }
    if (typeof value === 'string') {
      const escapedVal = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      routePattern = routePattern.replace(
        new RegExp(`/${escapedVal}(?=/|$)`),
        `/:${key}`
      );
    } else if (Array.isArray(value) && value.length > 0) {
      const escapedPath = value
        .map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('/');
      routePattern = routePattern.replace(
        new RegExp(`/${escapedPath}(?=/|$)`),
        `/:${key}*`
      );
    }
  }

  return routePattern;
}

/**
 * A client-side routing component for Next.js App Router that automatically
 * captures navigation events and updates route attributes.
 *
 * This component should be mounted inside a root Client Component layout.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { CrashlyticsNavigationTracker } from '@firebase/crashlytics/next-navigation';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <CrashlyticsNavigationTracker firebaseApp={app} />
 *         {children}
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 *
 * @public
 */
export function CrashlyticsNavigationTracker({
  firebaseApp,
  crashlyticsOptions
}: {
  firebaseApp: FirebaseApp;
  crashlyticsOptions?: CrashlyticsOptions;
}): null {
  const pathname = usePathname();
  const params = useParams();

  const crashlytics = getCrashlytics(firebaseApp, crashlyticsOptions);
  const pattern = getParameterizedRoute(pathname, params);

  useEffect(() => {
    const crashlyticsService = crashlytics as CrashlyticsInternal;
    crashlyticsService.attributesStore.setRoutePathProvider(() => pattern);
    return () => {
      crashlyticsService.attributesStore.setRoutePathProvider(undefined);
    };
  }, [crashlytics, pattern]);

  useEffect(() => {
    logViewBoundary(crashlytics, pattern);
  }, [pathname, params]);

  return null;
}
