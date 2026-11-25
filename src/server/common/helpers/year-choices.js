/** @import { Year } from '#server/common/helpers/year.js' */

/**
 * @param {Year[]} years
 * @returns {{ value: string, text: string}[]}
 */
export const buildYearChoices = (years) =>
  years.map((year) => ({
    value: String(year),
    text: String(year)
  }))
