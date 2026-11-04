import { JSDOM } from 'jsdom'

/**
 * @import { DOMWindow } from 'jsdom'
 */

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

/**
 * The body of a rendered page, for a query that reads the whole document
 * rather than one element of it.
 * @param {string} html
 */
export const documentOf = (html) => new JSDOM(html).window.document.body

/**
 * The body rows of a table, cell by cell, the row header included so a row
 * reads as it does on the page.
 * @param {InstanceType<DOMWindow['Element']>} table
 * @returns {string[][]}
 */
export const rowsOf = (table) =>
  Array.from(table.querySelectorAll('tbody tr')).map((row) =>
    Array.from(row.querySelectorAll('th, td')).map((cell) =>
      (cell.textContent ?? '').trim()
    )
  )

/**
 * The column headings of a table, in column order.
 * @param {InstanceType<DOMWindow['Element']>} table
 * @returns {string[]}
 */
export const headingsOf = (table) =>
  Array.from(table.querySelectorAll('thead th')).map((cell) =>
    (cell.textContent ?? '').trim()
  )
