/**
 * How many separate operators could have contributed to a figure, and how many
 * of them it includes a report from, as the backend serves them beside it.
 * @typedef {{ operatorCount: number, submittingOperatorCount: number }} OperatorCounts
 */

/**
 * The Analysis Function's shorthand for a figure that would give away
 * confidential information about a single respondent.
 */
const CONFIDENTIAL = '[c]'

/**
 * A figure from one or two operators is as good as theirs. Three is where it
 * stops being one business's figure, and a figure from none identifies no one.
 * @param {number} count
 */
const isFew = (count) => count === 1 || count === 2

/**
 * Whether either count marks a figure as coming from few operators.
 * @param {OperatorCounts} counts
 * @returns {boolean}
 */
export const fromFewOperators = ({ operatorCount, submittingOperatorCount }) =>
  isFew(operatorCount) || isFew(submittingOperatorCount)

/**
 * A formatted figure, followed by the confidential shorthand when few
 * operators contributed to it.
 * @param {string} figure
 * @param {OperatorCounts} counts
 * @returns {string}
 */
export const markedFigureOf = (figure, counts) =>
  fromFewOperators(counts) ? `${figure} ${CONFIDENTIAL}` : figure
