import assert from 'node:assert'

/**
 * Generic result wrapper for operations that may or may not succeed.
 * Both variants carry `value` and `error` so `const { value } = result`
 * destructuring type-checks; consumers should gate on `ok` before using
 * `value`.
 * @template T - The success value type (must be non-nullable)
 * @template [E=unknown] - The error type (defaults to `unknown` when omitted)
 * @typedef {{ ok: true, value: NonNullable<T>, error?: undefined } | { ok: false, value?: undefined, error?: E }} Result
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
 * @template T
 * @template [E=unknown]
 * @param {E} [error] - Optional error information
 * @returns {Result<T, E>}
 */
const err = (error) => {
  if (!error) {
    return { ok: false }
  }
  return { ok: false, error }
}

export { err, ok }
