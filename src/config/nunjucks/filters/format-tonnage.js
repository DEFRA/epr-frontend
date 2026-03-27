/**
 * @param {number | null | undefined} value
 * @param {Intl.LocalesArgument} locale
 * @returns {string}
 */
export function formatTonnage(value, locale = 'en-GB') {
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  return formatter.format(value ?? 0)
}

/**
 * Formats a whole-number tonnage with thousand separators and no decimal places.
 * Throws if value is not a non-negative integer.
 * @param {number} value
 * @param {Intl.LocalesArgument} locale
 * @returns {string}
 */
export function formatWholeNumberTonnage(value, locale = 'en-GB') {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new TypeError(
      `formatWholeNumberTonnage expects a non-negative integer, got: ${value}`
    )
  }

  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
    value
  )
}
