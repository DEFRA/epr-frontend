/**
 * How many separate operators could have contributed to a figure, and how many
 * of them it includes a report from, as the backend serves them beside it.
 * Those that could have contributed are the operators accredited for it: every
 * one that owed a report for the month, whether or not it sent one, and any
 * other whose report the figure includes.
 * @typedef {{ operatorCount: number, submittingOperatorCount: number }} OperatorCounts
 */

/**
 * The Analysis Function's shorthand for a figure that would give away
 * confidential information about a single respondent.
 */
const CONFIDENTIAL = '[c]'

/**
 * Whether one or two operators were accredited for a figure. Three is where
 * nobody can tell which of them reported, and a figure none were accredited
 * for identifies no one. How many actually reported does not matter.
 * @param {OperatorCounts} counts
 * @returns {boolean}
 */
export const fromFewOperators = ({ operatorCount }) =>
  operatorCount === 1 || operatorCount === 2

/**
 * A formatted figure, followed by the confidential shorthand when few
 * operators were accredited for it.
 * @param {string} figure
 * @param {OperatorCounts} counts
 * @returns {string}
 */
export const markedFigureOf = (figure, counts) =>
  fromFewOperators(counts) ? `${figure} ${CONFIDENTIAL}` : figure
