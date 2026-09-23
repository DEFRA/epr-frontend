/**
 * How many separate operators could have contributed to a figure, and how many
 * of them it includes a report from, as the backend serves them beside it.
 * @typedef {{ operatorCount: number, submittingOperatorCount: number }} OperatorCounts
 */

/** @typedef {(key: string, values?: Record<string, string | number>) => string} Localise */

/**
 * A figure from one or two operators is as good as theirs. Three is where it
 * stops being one business's figure, and a figure from none identifies no one.
 * @param {number} count
 */
const isFew = (count) => count === 1 || count === 2

/**
 * Both operator counts, stated for a figure either of them marks as coming
 * from few operators, and nothing for any other figure.
 * @param {OperatorCounts} counts
 * @param {Localise} localise
 * @returns {string | undefined}
 */
export const fewOperatorsOf = (
  { operatorCount, submittingOperatorCount },
  localise
) =>
  isFew(operatorCount) || isFew(submittingOperatorCount)
    ? localise('regulators:marketInsights:fewOperators:counts', {
        operators: operatorCount,
        submitting: submittingOperatorCount
      })
    : undefined
