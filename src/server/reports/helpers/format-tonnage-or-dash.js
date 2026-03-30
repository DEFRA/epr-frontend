import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'

/**
 * Formats a tonnage value to 2 decimal places, or returns '-' for null.
 * @param {number | null} value
 * @returns {string}
 */
export function formatTonnageOrDash(value) {
  return value === null ? '-' : formatTonnage(value)
}
