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
 * Whether fewer than three operators were accredited for a row that holds
 * data. Three is where nobody can tell which of them reported. A row with
 * one or two identifies them however few of them reported, so every figure
 * in it is marked even where that one figure is zero; a row with none
 * identifies whichever one still put something into it, so it is marked
 * only where the row holds data somewhere, for example a late report from an
 * operator cancelled for the whole month. A row with none accredited and
 * nothing in it identifies no one.
 * @param {OperatorCounts} counts
 * @param {boolean} rowHoldsData
 * @returns {boolean}
 */
export const fromFewOperators = ({ operatorCount }, rowHoldsData) =>
  operatorCount === 1 ||
  operatorCount === 2 ||
  (operatorCount === 0 && rowHoldsData)

/**
 * A formatted figure, followed by the confidential shorthand when few
 * operators were accredited for its row.
 * @param {string} figure
 * @param {OperatorCounts} counts
 * @param {boolean} rowHoldsData
 * @returns {string}
 */
export const markedFigureOf = (figure, counts, rowHoldsData) =>
  fromFewOperators(counts, rowHoldsData) ? `${figure} ${CONFIDENTIAL}` : figure

/**
 * Whether the published workbook shows a total without the confidential
 * figures it includes: the total includes a figure marked confidential, and
 * few operators were not accredited for the total itself, which would
 * withhold it instead.
 * @param {boolean} includesMarked
 * @param {boolean} totalMarked
 * @returns {boolean}
 */
export const leavesOutConfidential = (includesMarked, totalMarked) =>
  includesMarked && !totalMarked

/**
 * The sum of the given figures.
 * @param {number[]} figures
 * @returns {number}
 */
export const sumOf = (figures) =>
  figures.reduce((sum, figure) => sum + figure, 0)
