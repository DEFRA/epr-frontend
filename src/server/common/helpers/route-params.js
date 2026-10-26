import Joi from 'joi'

import { YEAR_SEGMENT, toYear } from './year.js'

/**
 * The years the service will answer for at all. Every `{year}` address is
 * bound the same way - a year one address accepts and another rejects is
 * worse than either bound.
 */
export const MIN_YEAR = 2024
export const MAX_YEAR = 2100

/**
 * A `{year}` path segment, read as a `Year`: four digits, within the years the
 * service answers for.
 */
export const yearParam = Joi.string()
  .pattern(YEAR_SEGMENT)
  .custom((segment, helpers) => {
    const year = Number(segment)

    return year >= MIN_YEAR && year <= MAX_YEAR
      ? toYear(year)
      : helpers.error('any.invalid')
  })
