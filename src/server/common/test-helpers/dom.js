/**
 * Asserts a Hapi inject `result` (typed `object | undefined`) is the HTML string
 * that cheerio's `load` and `JSDOM` expect, so response-rendering assertions can
 * parse the body without repeating an inline cast. Throws a named error rather
 * than handing a non-string body to cheerio.
 * @param {unknown} result
 * @returns {string}
 */
export const asHtml = (result) => {
  if (typeof result !== 'string') {
    throw new Error('expected a string response body')
  }

  return result
}
