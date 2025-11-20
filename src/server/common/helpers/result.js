/**
 * Generic result wrapper for operations that may or may not succeed
 * @template T - The success value type
 * @template E - The error type (optional)
 * @typedef {{ ok: true, value: T } | { ok: false, error?: E }} Result
 */

/**
 * Success result
 * @template T
 * @param {T} value - The successful value
 * @returns {Result<T>}
 */
function ok(value) {
  return { ok: true, value }
}

/**
 * Error/not found result
 * @template T, E
 * @param {E} [error] - Optional error information
 * @returns {Result<T, E>}
 */
function err(error) {
  const result = { ok: false }
  if (error !== undefined) {
    result.error = error
  }
  return result
}

export { err, ok }
