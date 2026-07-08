import { isNil } from '#server/common/helpers/is-nil.js'

/**
 * Builds a formatter that returns a dash when the value is absent
 * (null/undefined), otherwise formats it. Keeps "not yet provided" out of the
 * formatter. Partially apply with a formatter, then call with values.
 * @param {(value: number) => string} format
 * @returns {(value: number | null | undefined) => string}
 */
export const orDash = (format) => (value) =>
  isNil(value) ? '-' : format(value)
