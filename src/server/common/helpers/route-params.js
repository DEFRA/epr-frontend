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

/**
 * Hapi tags each validation failure with the part of the request it is in.
 * @param {unknown} error
 */
const isParamsError = (error) =>
  /** @type {{ output: { payload: { validation?: { source: string } } } }} */ (
    error
  ).output.payload.validation?.source === 'params'

const OTHER_SOURCES = /** @type {const} */ ([
  'query',
  'payload',
  'headers',
  'state'
])

/**
 * A route whose address names a `{year}`. A year the service does not answer
 * for has no page, so it is a 404 whatever else the route validates; a route's
 * own `failAction` keeps every other failure.
 *
 * A route that validates its own params, or validates anything else without a
 * `failAction` function, is refused: the year would replace the one, and its
 * 404 would swallow the failures of the other.
 * @template {{ path: string, options?: object }} Route
 * @param {Route} route
 * @returns {Route}
 */
export const yearAddressed = (route) => {
  const { validate = {} } = /** @type {{ validate?: RouteOptionsValidate }} */ (
    route.options ?? {}
  )
  const ownFailAction = validate.failAction

  if (validate.params) {
    throw new Error(`${route.path} validates its own params`)
  }

  const unhandled = OTHER_SOURCES.find(
    (source) => validate[source] && typeof ownFailAction !== 'function'
  )

  if (unhandled) {
    throw new Error(
      `${route.path} validates its ${unhandled} without a failAction of its own`
    )
  }

  /** @type {Lifecycle.Method} */
  const failAction = function (request, h, error) {
    if (isParamsError(error) || typeof ownFailAction !== 'function') {
      throw Boom.notFound()
    }

    return ownFailAction.call(this, request, h, error)
  }

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
