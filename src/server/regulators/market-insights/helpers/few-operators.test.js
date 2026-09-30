import { describe, expect, it } from 'vitest'

import { fromFewOperators, markedFigureOf } from './few-operators.js'

describe(fromFewOperators, () => {
  it.each([
    [1, 1],
    [1, 0],
    [2, 0],
    [2, 2]
  ])(
    'holds when %i operators were accredited for the row, however many, %i, reported, whether or not it holds data',
    (operatorCount, submittingOperatorCount) => {
      expect(
        fromFewOperators({ operatorCount, submittingOperatorCount }, false)
      ).toBe(true)
      expect(
        fromFewOperators({ operatorCount, submittingOperatorCount }, true)
      ).toBe(true)
    }
  )

  it('holds when no operators were accredited for a row that holds data', () => {
    expect(
      fromFewOperators({ operatorCount: 0, submittingOperatorCount: 0 }, true)
    ).toBe(true)
  })

  it('does not hold when no operators were accredited for a row with no data', () => {
    expect(
      fromFewOperators({ operatorCount: 0, submittingOperatorCount: 0 }, false)
    ).toBe(false)
  })

  it.each([
    [3, 0],
    [3, 1],
    [5, 2],
    [12, 7]
  ])(
    'does not hold when %i operators were accredited for the row, however few of them, %i, reported, whether or not it holds data',
    (operatorCount, submittingOperatorCount) => {
      expect(
        fromFewOperators({ operatorCount, submittingOperatorCount }, false)
      ).toBe(false)
      expect(
        fromFewOperators({ operatorCount, submittingOperatorCount }, true)
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
        true
      )
    ).toBe('8.00 [c]')
  })

  it('follows a figure in a row that holds data but has no accredited operator with the confidential shorthand', () => {
    expect(
      markedFigureOf(
        '0.00',
        { operatorCount: 0, submittingOperatorCount: 0 },
        true
      )
    ).toBe('0.00 [c]')
  })

  it('leaves a figure in a row with no data as it is, however few operators were accredited for it', () => {
    expect(
      markedFigureOf(
        '0.00',
        { operatorCount: 0, submittingOperatorCount: 0 },
        false
      )
    ).toBe('0.00')
  })

  it('leaves any other figure as it is', () => {
    expect(
      markedFigureOf(
        '8.00',
        { operatorCount: 3, submittingOperatorCount: 1 },
        true
      )
    ).toBe('8.00')
  })

  it('follows a total that includes a marked figure with the marker for one, however many operators were accredited for the total', () => {
    expect(
      markedFigureOf(
        '8.00',
        { operatorCount: 5, submittingOperatorCount: 5 },
        true,
        true
      )
    ).toBe('8.00 [c]')
  })

  it('follows a total few operators were accredited for with the confidential shorthand, whether or not it includes a marked figure', () => {
    expect(
      markedFigureOf(
        '8.00',
        { operatorCount: 2, submittingOperatorCount: 2 },
        true,
        true
      )
    ).toBe('8.00 [c]')
  })

  it('leaves a total that includes no marked figure to its own accredited count', () => {
    expect(
      markedFigureOf(
        '8.00',
        { operatorCount: 5, submittingOperatorCount: 5 },
        true,
        false
      )
    ).toBe('8.00')
  })
})
