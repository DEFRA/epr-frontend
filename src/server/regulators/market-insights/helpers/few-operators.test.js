import { describe, expect, it } from 'vitest'

import { fewOperatorsOf } from './few-operators.js'

/**
 * @param {string} key
 * @param {Record<string, string | number>} [values]
 */
const asKey = (key, values = {}) =>
  [
    'translated',
    key,
    ...Object.entries(values).map(([name, value]) => `${name}=${value}`)
  ].join(':')

describe(fewOperatorsOf, () => {
  it.each([
    [1, 1],
    [2, 0],
    [2, 2],
    [5, 1],
    [9, 2]
  ])(
    'states both counts when %i operators could have contributed and %i did',
    (operatorCount, submittingOperatorCount) => {
      expect(
        fewOperatorsOf({ operatorCount, submittingOperatorCount }, asKey)
      ).toBe(
        `translated:regulators:marketInsights:fewOperators:counts:operators=${operatorCount}:submitting=${submittingOperatorCount}`
      )
    }
  )

  it.each([
    [0, 0],
    [3, 0],
    [3, 3],
    [12, 7]
  ])(
    'marks nothing when %i operators could have contributed and %i did',
    (operatorCount, submittingOperatorCount) => {
      expect(
        fewOperatorsOf({ operatorCount, submittingOperatorCount }, asKey)
      ).toBeUndefined()
    }
  )
})
