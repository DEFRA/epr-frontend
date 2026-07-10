/**
 * Casts a Hapi inject `result` (typed `object | undefined`) to the HTML string
 * that cheerio's `load` and `JSDOM` expect, so response-rendering assertions can
 * parse the body without repeating an inline cast.
 * @param {unknown} result
 * @returns {string}
 */
export const asHtml = (result) => /** @type {string} */ (result)
