/**
 * @license
 * Copyright 2022 Google LLC
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

import { CompositeFilter, Filter } from "../core/target";

/**
 * Provides utility functions that help with boolean logic transformations needed for handling
 * complex filters used in queries.
 */

/**
 * Given a composite filter, returns the list of terms in its disjunctive normal form.
 *
 * <p>Each element in the return value is one term of the resulting DNF. For instance: For the
 * input: (A || B) && C, the DNF form is: (A && C) || (B && C), and the return value is a list
 * with two elements: a composite filter that performs (A && C), and a composite filter that
 * performs (B && C).
 *
 * @param filter the composite filter to calculate DNF transform for.
 * @return the terms in the DNF transform.
 */
export function dnfTransform(filter: CompositeFilter): Filter[] {
    // TODO(orquery): write the DNF transform algorithm here.
    // For now, assume all inputs are of the form AND(A, B, ...). Therefore the resulting DNF form
    // is the same as the input.
    if (filter.getFilters().isEmpty()) {
        return Collections.emptyList();
    }
    return Collections.singletonList(filter);
}