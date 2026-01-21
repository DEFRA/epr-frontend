/**
 * @param {number | null | undefined} value
 * @param {Intl.LocalesArgument} locale
 * @returns {string}
 */
export function formatTonnage(value, locale = 'en-GB') {
  if (value === null || value === undefined) {
    return '-'
  }

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })

  return formatter.format(value)
}
