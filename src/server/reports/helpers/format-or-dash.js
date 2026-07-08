import { isNil } from '#server/common/helpers/is-nil.js'

/**
 * Formats a value with the given formatter, or returns a dash when the value is
 * absent (null/undefined). Keeps "not yet provided" out of the formatter.
 * @param {number | null | undefined} value
 * @param {(value: number) => string} format
 * @returns {string}
 */
export const orDash = (value, format) => (isNil(value) ? '-' : format(value))
