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

import {
  CompositeFilter,
  compositeFilterIsConjunction,
  compositeFilterIsDisjunction,
  compositeFilterIsFlat,
  compositeFilterIsFlatConjunction,
  compositeFilterWithAddedFilters,
  CompositeOperator,
  FieldFilter,
  Filter,
  InFilter,
  Operator
} from '../core/filter';

import { hardAssert } from './assert';

/**
 * Provides utility functions that help with boolean logic transformations needed for handling
 * complex filters used in queries.
 */

/**
 * The `in` filter is only a syntactic sugar over a disjunction of equalities. For instance: `a in
 * [1,2,3]` is in fact `a==1 || a==2 || a==3`. This method expands any `in` filter in the given
 * input into a disjunction of equality filters and returns the expanded filter.
 */
export function computeInExpansion(filter: Filter): Filter {
  hardAssert(
    filter instanceof FieldFilter || filter instanceof CompositeFilter,
    'Only field filters and composite filters are accepted.'
  );

  if (filter instanceof FieldFilter) {
    if (filter instanceof InFilter) {
      const expandedFilters =
        filter.value.arrayValue?.values?.map(value =>
          FieldFilter.create(filter.field, Operator.EQUAL, value)
        ) || [];

      return CompositeFilter.create(expandedFilters, CompositeOperator.OR);
    } else {
      // We have reached other kinds of field filters.
      return filter;
    }
  }

  // We have a composite filter.
  const expandedFilters = filter.filters.map(subfilter =>
    computeInExpansion(subfilter)
  );
  return CompositeFilter.create(expandedFilters, filter.op);
}

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
export function getDnfTerms(filter: CompositeFilter): Filter[] {
  if (filter.getFilters().length === 0) {
    return [];
  }

  const result: Filter = computeDistributedNormalForm(
    computeInExpansion(filter)
  );

  hardAssert(
    isDisjunctiveNormalForm(result),
    'computeDistributedNormalForm did not result in disjunctive normal form'
  );

  if (isSingleFieldFilter(result) || isFlatConjunction(result)) {
    return [result];
  }

  return result.getFilters();
}

/** Returns true if the given filter is a single field filter. e.g. (a == 10). */
function isSingleFieldFilter(filter: Filter): boolean {
  return filter instanceof FieldFilter;
}

/**
 * Returns true if the given filter is the conjunction of one or more field filters. e.g. (a == 10
 * && b == 20)
 */
function isFlatConjunction(filter: Filter): boolean {
  return (
    filter instanceof CompositeFilter &&
    compositeFilterIsFlatConjunction(filter)
  );
}

/**
 * Returns whether or not the given filter is in disjunctive normal form (DNF).
 *
 * <p>In boolean logic, a disjunctive normal form (DNF) is a canonical normal form of a logical
 * formula consisting of a disjunction of conjunctions; it can also be described as an OR of ANDs.
 *
 * <p>For more info, visit: https://en.wikipedia.org/wiki/Disjunctive_normal_form
 */
function isDisjunctiveNormalForm(filter: Filter): boolean {
  return (
    isSingleFieldFilter(filter) ||
    isFlatConjunction(filter) ||
    isDisjunctionOfFieldFiltersAndFlatConjunctions(filter)
  );
}

/**
 * Returns true if the given filter is the disjunction of one or more "flat conjunctions" and
 * field filters. e.g. (a == 10) || (b==20 && c==30)
 */
function isDisjunctionOfFieldFiltersAndFlatConjunctions(
  filter: Filter
): boolean {
  if (filter instanceof CompositeFilter) {
    if (compositeFilterIsDisjunction(filter)) {
      for (const subFilter of filter.getFilters()) {
        if (!isSingleFieldFilter(subFilter) && !isFlatConjunction(subFilter)) {
          return false;
        }
      }

      return true;
    }
  }

  return false;
}

export function computeDistributedNormalForm(filter: Filter): Filter {
  hardAssert(
    filter instanceof FieldFilter || filter instanceof CompositeFilter,
    'Only field filters and composite filters are accepted.'
  );

  if (filter instanceof FieldFilter) {
    return filter;
  }

  if (filter.filters.length === 1) {
    return computeDistributedNormalForm(filter.filters[0]);
  }

  // Compute DNF for each of the subfilters first
  const result = filter.filters.map(subfilter =>
    computeDistributedNormalForm(subfilter)
  );

  let newFilter: Filter = CompositeFilter.create(result, filter.op);
  newFilter = applyAssociation(newFilter);

  if (isDisjunctiveNormalForm(newFilter)) {
    return newFilter;
  }

  hardAssert(
    newFilter instanceof CompositeFilter,
    'field filters are already in DNF form'
  );
  hardAssert(
    compositeFilterIsConjunction(newFilter),
    'Disjunction of filters all of which are already in DNF form is itself in DNF form.'
  );
  hardAssert(
    newFilter.filters.length > 1,
    'Single-filter composite filters are already in DNF form.'
  );

  return newFilter.filters.reduce((runningResult, filter) =>
    applyDistribution(runningResult, filter)
  );
}

export function applyDistribution(lhs: Filter, rhs: Filter): Filter {
  hardAssert(
    lhs instanceof FieldFilter || lhs instanceof CompositeFilter,
    'Only field filters and composite filters are accepted.'
  );
  hardAssert(
    rhs instanceof FieldFilter || rhs instanceof CompositeFilter,
    'Only field filters and composite filters are accepted.'
  );

  let result: Filter;

  if (lhs instanceof FieldFilter) {
    if (rhs instanceof FieldFilter) {
      // FieldFilter FieldFilter
      result = applyDistributionFieldFilters(lhs, rhs);
    } else {
      // FieldFilter CompositeFilter
      result = applyDistributionFieldAndCompositeFilters(lhs, rhs);
    }
  } else {
    if (rhs instanceof FieldFilter) {
      // CompositeFilter FieldFilter
      result = applyDistributionFieldAndCompositeFilters(rhs, lhs);
    } else {
      // CompositeFilter CompositeFilter
      result = applyDistributionCompositeFilters(lhs, rhs);
    }
  }

  return applyAssociation(result);
}

function applyDistributionFieldFilters(
  lhs: FieldFilter,
  rhs: FieldFilter
): Filter {
  // Conjunction distribution for two field filters is the conjunction of them.
  return CompositeFilter.create([lhs, rhs], CompositeOperator.AND);
}

function applyDistributionCompositeFilters(
  lhs: CompositeFilter,
  rhs: CompositeFilter
): Filter {
  hardAssert(
    lhs.filters.length > 0 && rhs.filters.length > 0,
    'Found an empty composite filter'
  );

  // There are four cases:
  // (A & B) & (C & D) --> (A & B & C & D)
  // (A & B) & (C | D) --> (A & B & C) | (A & B & D)
  // (A | B) & (C & D) --> (C & D & A) | (C & D & B)
  // (A | B) & (C | D) --> (A & C) | (A & D) | (B & C) | (B & D)

  // Case 1 is a merge.
  if (compositeFilterIsConjunction(lhs) && compositeFilterIsConjunction(rhs)) {
    return compositeFilterWithAddedFilters(lhs, rhs.getFilters());
  }

  // Case 2,3,4 all have at least one side (lhs or rhs) that is a disjunction. In all three cases
  // we should take each element of the disjunction and distribute it over the other side, and
  // return the disjunction of the distribution results.
  const disjunctionSide = compositeFilterIsDisjunction(lhs) ? lhs : rhs;
  const otherSide = compositeFilterIsDisjunction(lhs) ? rhs : lhs;
  const results = disjunctionSide.filters.map(subfilter =>
    applyDistribution(subfilter, otherSide)
  );
  return CompositeFilter.create(results, CompositeOperator.OR);
}

function applyDistributionFieldAndCompositeFilters(
  fieldFilter: FieldFilter,
  compositeFilter: CompositeFilter
): Filter {
  // There are two cases:
  // A & (B & C) --> (A & B & C)
  // A & (B | C) --> (A & B) | (A & C)
  if (compositeFilterIsConjunction(compositeFilter)) {
    // Case 1
    return compositeFilterWithAddedFilters(
      compositeFilter,
      fieldFilter.getFilters()
    );
  } else {
    // Case 2
    const newFilters = compositeFilter.filters.map(subfilter =>
      applyDistribution(fieldFilter, subfilter)
    );

    return CompositeFilter.create(newFilters, CompositeOperator.OR);
  }
}

/**
 * Applies the associativity property to the given filter and returns the resulting filter.
 *
 * <ul>
 *   <li>A | (B | C) == (A | B) | C == (A | B | C)
 *   <li>A & (B & C) == (A & B) & C == (A & B & C)
 * </ul>
 *
 * <p>For more info, visit: https://en.wikipedia.org/wiki/Associative_property#Propositional_logic
 */
export function applyAssociation(filter: Filter): Filter {
  hardAssert(
    filter instanceof FieldFilter || filter instanceof CompositeFilter,
    'Only field filters and composite filters are accepted.'
  );

  if (filter instanceof FieldFilter) {
    return filter;
  }

  const filters = filter.getFilters();

  // If the composite filter only contains 1 filter, apply associativity to it.
  if (filters.length === 1) {
    return applyAssociation(filters[0]);
  }

  // Associativity applied to a flat composite filter results is itself.
  if (compositeFilterIsFlat(filter)) {
    return filter;
  }

  // First apply associativity to all subfilters. This will in turn recursively apply
  // associativity to all nested composite filters and field filters.
  const updatedFilters = filters.map(subfilter => applyAssociation(subfilter));

  // For composite subfilters that perform the same kind of logical operation as `compositeFilter`
  // take out their filters and add them to `compositeFilter`. For example:
  // compositeFilter = (A | (B | C | D))
  // compositeSubfilter = (B | C | D)
  // Result: (A | B | C | D)
  // Note that the `compositeSubfilter` has been eliminated, and its filters (B, C, D) have been
  // added to the top-level "compositeFilter".
  const newSubfilters: Filter[] = [];
  updatedFilters.forEach(subfilter => {
    if (subfilter instanceof FieldFilter) {
      newSubfilters.push(subfilter);
    } else if (subfilter instanceof CompositeFilter) {
      if (subfilter.op === filter.op) {
        // compositeFilter: (A | (B | C))
        // compositeSubfilter: (B | C)
        // Result: (A | B | C)
        newSubfilters.push(...subfilter.filters);
      } else {
        // compositeFilter: (A | (B & C))
        // compositeSubfilter: (B & C)
        // Result: (A | (B & C))
        newSubfilters.push(subfilter);
      }
    }
  });

  if (newSubfilters.length === 1) {
    return newSubfilters[0];
  }

  return CompositeFilter.create(newSubfilters, filter.op);
}
