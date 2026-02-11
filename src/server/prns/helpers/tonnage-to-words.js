import { ToWords } from 'to-words'

const toWords = new ToWords({ localeCode: 'en-GB' })

/**
 * Convert a non-negative integer tonnage to its English word representation
 * @param {number} tonnage
 * @returns {string}
 */
export function tonnageToWords(tonnage) {
  const words = toWords.convert(tonnage).toLowerCase()

  return words
    .replace(/hundred (?=[a-z])/g, 'hundred and ')
    .replace(/thousand (?=[a-z])(?!.*hundred)/g, 'thousand and ')
    .replace(/million (?=[a-z])(?!.*(?:thousand|hundred))/g, 'million and ')
    .replace(
      /billion (?=[a-z])(?!.*(?:million|thousand|hundred))/g,
      'billion and '
    )
    .replace(/^./, (c) => c.toUpperCase())
}
