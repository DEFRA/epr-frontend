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
