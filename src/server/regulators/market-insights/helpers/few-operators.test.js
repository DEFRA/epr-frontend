import { describe, expect, it } from 'vitest'

import { fromFewOperators, markedFigureOf } from './few-operators.js'

describe(fromFewOperators, () => {
  it.each([
    [1, 1],
    [1, 0],
    [2, 0],
    [2, 2]
  ])(
    'holds when %i operators were accredited for the figure, however many, %i, reported, whether or not it holds data',
    (operatorCount, submittingOperatorCount) => {
      expect(
        fromFewOperators({ operatorCount, submittingOperatorCount }, 0)
      ).toBe(true)
      expect(
        fromFewOperators({ operatorCount, submittingOperatorCount }, 8)
      ).toBe(true)
    }
  )

  it('holds when no operators were accredited for a figure that holds data', () => {
    expect(
      fromFewOperators({ operatorCount: 0, submittingOperatorCount: 0 }, 8)
    ).toBe(true)
  })

  it('does not hold when no operators were accredited for a figure with no data', () => {
    expect(
      fromFewOperators({ operatorCount: 0, submittingOperatorCount: 0 }, 0)
    ).toBe(false)
  })

  it.each([
    [3, 0],
    [3, 1],
    [5, 2],
    [12, 7]
  ])(
    'does not hold when %i operators were accredited for the figure, however few of them, %i, reported, whether or not it holds data',
    (operatorCount, submittingOperatorCount) => {
      expect(
        fromFewOperators({ operatorCount, submittingOperatorCount }, 0)
      ).toBe(false)
      expect(
        fromFewOperators({ operatorCount, submittingOperatorCount }, 8)
      ).toBe(false)
    }
  )
})

describe(markedFigureOf, () => {
  it('follows a figure few operators were accredited for with the confidential shorthand', () => {
    expect(
      markedFigureOf(
        '8.00',
        { operatorCount: 2, submittingOperatorCount: 2 },
        8
      )
    ).toBe('8.00 [c]')
  })

  it('follows a figure with data but no accredited operator with the confidential shorthand', () => {
    expect(
      markedFigureOf(
        '8.00',
        { operatorCount: 0, submittingOperatorCount: 0 },
        8
      )
    ).toBe('8.00 [c]')
  })

  it('leaves a figure with no data as it is, however few operators were accredited for it', () => {
    expect(
      markedFigureOf(
        '0.00',
        { operatorCount: 0, submittingOperatorCount: 0 },
        0
      )
    ).toBe('0.00')
  })

  it('leaves any other figure as it is', () => {
    expect(
      markedFigureOf(
        '8.00',
        { operatorCount: 3, submittingOperatorCount: 1 },
        8
      )
    ).toBe('8.00')
  })
})
