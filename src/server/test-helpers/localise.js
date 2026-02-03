/**
 * Creates a mock localise function that returns the key with interpolated params.
 *
 * Use when tests don't need specific translated text.
 * @example With no translations (passthrough mode)
 * const t = createMockLocalise()
 * t('prns:create:pageTitle', { noteType: 'PRN' })
 * // Returns: 'prns:create:pageTitle'
 * @example With translations for specific assertions
 * const t = createMockLocalise({
 *   'prns:create:pageTitle': 'Create a {{noteType}}'
 * })
 * t('prns:create:pageTitle', { noteType: 'PRN' })
 * @param {Record<string, string>} [translations] - Optional translation lookup
 * @returns {(key: string, params?: Record<string, string | number>) => string}
 */
export const createMockLocalise =
  (translations = {}) =>
  (key, params = {}) => {
    let text = translations[key] ?? key
    for (const [param, value] of Object.entries(params)) {
      text = text.replaceAll(`{{${param}}}`, String(value))
    }
    return text
  }
