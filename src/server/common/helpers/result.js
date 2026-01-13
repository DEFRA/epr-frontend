import assert from 'node:assert'

/**
 * Generic result wrapper for operations that may or may not succeed
 * @template T - The success value type (must be non-nullable)
 * @template E - The error type (optional)
 * @typedef {{ ok: true, value: NonNullable<T> } | { ok: false, error?: E }} Result
 */

/**
 * Success result
 * @template T
 * @param {NonNullable<T>} value - The successful value (required)
 * @returns {Result<T>}
 */
const ok = (value) => {
  assert(value, 'ok() value must be provided')

  return { ok: true, value }
}

/**
 * Error/not found result
 * @template T, E
 * @param {E} [error] - Optional error information
 * @returns {Result<T, E>}
 */
const err = (error) => {
  const result = { ok: false }
  if (error) {
    result.error = error
  }
  return result
}

export { err, ok }
