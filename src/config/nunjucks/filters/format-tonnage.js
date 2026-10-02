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
 * A null or undefined value formats as zero, consistent with formatTonnage.
 * @param {number | null | undefined} value
 * @param {Intl.LocalesArgument} locale
 * @returns {string}
 */
export const formatWholeNumberTonnage = (value, locale = 'en-GB') =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value ?? 0)

/**
 * Formats a movement in a tonnage, stating its direction: a tonnage that went
 * up reads with a plus, one that went down with a minus. A movement of nothing
 * has no direction to state, so it reads unsigned.
 * @param {number} value
 * @param {Intl.LocalesArgument} locale
 * @returns {string}
 */
export const formatSignedTonnage = (value, locale = 'en-GB') =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero'
  }).format(value)
