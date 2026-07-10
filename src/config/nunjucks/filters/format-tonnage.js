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
 * A missing value formats as zero, consistent with formatTonnage.
 * @param {number | null | undefined} value
 * @param {Intl.LocalesArgument} locale
 * @returns {string}
 */
export const formatWholeNumberTonnage = (value, locale = 'en-GB') =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value ?? 0)
