/** @import { Year } from '#server/common/helpers/year.js' */

/**
 * A market insights address for one year.
 * @param {string} path a route path naming `{year}`
 * @param {Year} year
 * @returns {string}
 */
export const yearPath = (path, year) => path.replace('{year}', String(year))
