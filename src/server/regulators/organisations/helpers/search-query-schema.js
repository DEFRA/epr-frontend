import Joi from 'joi'

/**
 * What the results page reads out of the query string once Joi has validated
 * it. Both carry a default, so the page a regulator arrives at with no query
 * at all is the first page of every organisation.
 * @typedef {{ search: string, page: number }} SearchQuery
 */

export const searchQuerySchema = Joi.object({
  search: Joi.string().trim().allow('').default(''),
  page: Joi.number().integer().min(1).default(1)
})
