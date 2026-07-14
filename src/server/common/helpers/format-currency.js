/**
 * Formats a value as currency. A null or undefined value formats as zero,
 * consistent with the tonnage formatters.
 * @param {Parameters<Intl.NumberFormat['format']>[0] | null | undefined} value
 * @param {Intl.LocalesArgument} locale
 * @param {string} currency
 */
export function formatCurrency(value, locale = 'en-GB', currency = 'GBP') {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  })

  return formatter.format(value ?? 0)
}
