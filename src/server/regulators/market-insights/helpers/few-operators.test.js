import { describe, expect, it } from 'vitest'

import { fromFewOperators, markedFigureOf } from './few-operators.js'

const FEW = [
  [1, 1],
  [2, 0],
  [2, 2],
  [5, 1],
  [9, 2]
]

const MANY_OR_NONE = [
  [0, 0],
  [3, 0],
  [3, 3],
  [12, 7]
]

describe(fromFewOperators, () => {
  it.each(FEW)(
    'holds when %i operators could have contributed and %i did',
    (operatorCount, submittingOperatorCount) => {
      expect(fromFewOperators({ operatorCount, submittingOperatorCount })).toBe(
        true
      )
    }
  )

  it.each(MANY_OR_NONE)(
    'does not hold when %i operators could have contributed and %i did',
    (operatorCount, submittingOperatorCount) => {
      expect(fromFewOperators({ operatorCount, submittingOperatorCount })).toBe(
        false
      )
    }
  )
})

describe(markedFigureOf, () => {
  it('follows a figure few operators contributed to with the confidential shorthand', () => {
    expect(
      markedFigureOf('8.00', { operatorCount: 1, submittingOperatorCount: 1 })
    ).toBe('8.00 [c]')
  })

  it('leaves any other figure as it is', () => {
    expect(
      markedFigureOf('8.00', { operatorCount: 3, submittingOperatorCount: 3 })
    ).toBe('8.00')
  })
})
