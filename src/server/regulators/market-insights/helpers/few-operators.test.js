import { describe, expect, it } from 'vitest'

import { fromFewOperators, markedFigureOf } from './few-operators.js'

describe(fromFewOperators, () => {
  it.each([
    [1, 1],
    [1, 0],
    [2, 0],
    [2, 2]
  ])(
    'holds when %i operators were accredited for the figure, whether %i contributed',
    (operatorCount, submittingOperatorCount) => {
      expect(fromFewOperators({ operatorCount, submittingOperatorCount })).toBe(
        true
      )
    }
  )

  it.each([
    [0, 0],
    [3, 0],
    [3, 1],
    [5, 2],
    [12, 7]
  ])(
    'does not hold when %i operators were accredited for the figure, however few of them, %i, contributed',
    (operatorCount, submittingOperatorCount) => {
      expect(fromFewOperators({ operatorCount, submittingOperatorCount })).toBe(
        false
      )
    }
  )
})

describe(markedFigureOf, () => {
  it('follows a figure few operators were accredited for with the confidential shorthand', () => {
    expect(
      markedFigureOf('8.00', { operatorCount: 2, submittingOperatorCount: 2 })
    ).toBe('8.00 [c]')
  })

  it('leaves any other figure as it is', () => {
    expect(
      markedFigureOf('8.00', { operatorCount: 3, submittingOperatorCount: 1 })
    ).toBe('8.00')
  })
})
