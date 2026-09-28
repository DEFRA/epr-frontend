/**
 * How many separate operators were accredited for a figure that month, whether
 * or not they reported, and how many it includes a report from, as the backend
 * serves them beside it.
 * @typedef {{ operatorCount: number, submittingOperatorCount: number }} OperatorCounts
 */

/**
 * The Analysis Function's shorthand for a figure that would give away
 * confidential information about a single respondent.
 */
const CONFIDENTIAL = '[c]'

/**
 * Whether fewer than three operators were accredited for a figure that holds
 * data. Three is where nobody can tell which of them reported. A figure with
 * one or two identifies them however few of them reported; a figure with
 * none identifies whichever one still put something into it, for example one
 * cancelled for the whole month whose late report still landed. A figure
 * with none accredited and nothing in it identifies no one.
 * @param {OperatorCounts} counts
 * @param {number} value
 * @returns {boolean}
 */
export const fromFewOperators = ({ operatorCount }, value) =>
  operatorCount === 1 ||
  operatorCount === 2 ||
  (operatorCount === 0 && value !== 0)

/**
 * A formatted figure, followed by the confidential shorthand when few
 * operators were accredited for it.
 * @param {string} figure
 * @param {OperatorCounts} counts
 * @param {number} value
 * @returns {string}
 */
export const markedFigureOf = (figure, counts, value) =>
  fromFewOperators(counts, value) ? `${figure} ${CONFIDENTIAL}` : figure
