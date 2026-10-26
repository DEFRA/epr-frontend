import Boom from '@hapi/boom'
import Joi from 'joi'

import { toYear } from './year.js'

/**
 * @import { Lifecycle, RouteOptionsValidate } from '@hapi/hapi'
 */

/**
 * The years the service will answer for at all. Every `{year}` address is
 * bound the same way - a year one address accepts and another rejects is
 * worse than either bound.
 */
const MIN_YEAR = 2024
const MAX_YEAR = 2100
const FOUR_DIGITS = /^\d{4}$/

/**
 * A `{year}` path segment, read as a `Year`: four digits, within the years the
 * service answers for.
 */
export const yearParam = Joi.string()
  .pattern(FOUR_DIGITS)
  .custom((segment, helpers) => {
    const year = Number(segment)

    return year >= MIN_YEAR && year <= MAX_YEAR
      ? toYear(year)
      : helpers.error('any.invalid')
  })

const notFound = () => {
  throw Boom.notFound()
}

/**
 * Hapi tags each validation failure with the part of the request it is in.
 * @param {unknown} error
 */
const isParamsError = (error) =>
  /** @type {{ output: { payload: { validation?: { source: string } } } }} */ (
    error
  ).output.payload.validation?.source === 'params'

/**
 * A route whose address names a `{year}`. A year the service does not answer
 * for has no page, so it is a 404 whatever else the route validates; a route's
 * own `failAction` keeps every other failure.
 * @template {{ path: string, options?: object }} Route
 * @param {Route} route
 * @returns {Route}
 */
export const yearAddressed = (route) => {
  const { validate = {} } = /** @type {{ validate?: RouteOptionsValidate }} */ (
    route.options ?? {}
  )
  const ownFailAction = validate.failAction

  /** @type {Lifecycle.Method} */
  const failAction =
    typeof ownFailAction === 'function'
      ? (request, h, error) =>
          isParamsError(error)
            ? notFound()
            : ownFailAction.call(null, request, h, error)
      : notFound

  return {
    ...route,
    options: {
      ...route.options,
      validate: {
        ...validate,
        params: Joi.object({ year: yearParam.required() }).unknown(),
        failAction
      }
    }
  }
}
