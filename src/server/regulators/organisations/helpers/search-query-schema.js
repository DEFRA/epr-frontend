import Joi from 'joi'

/**
 * What the results page reads out of the query string once Joi has validated
 * it. Both carry a default, so the page a regulator arrives at with no query
 * at all is the first page of every organisation.
 * @typedef {{ search: string, page: number }} SearchQuery
 */

/**
 * The backend caps a search term at the same length and answers a longer one
 * with a 400, which reaches the regulator as an error page rather than as no
 * results. So an over-long term is cut to fit rather than refused. The search
 * matches on a substring, so a shorter term can only widen the results and
 * never hides a match the whole term would have found.
 */
const MAX_SEARCH_LENGTH = 200

/**
 * A query key this page does not know is dropped rather than refused, so a
 * link a regulator was sent carrying a tracking parameter still opens the
 * search.
 */
export const searchQuerySchema = Joi.object({
  search: Joi.string()
    .trim()
    .max(MAX_SEARCH_LENGTH)
    .truncate()
    .allow('')
    .default(''),
  page: Joi.number().integer().min(1).default(1)
}).options({ stripUnknown: true })
