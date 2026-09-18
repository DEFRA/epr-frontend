import Joi from 'joi'

/**
 * The build a page is watching, as it arrives in the query string. Empty means
 * no build is being watched, which is what asks the backend to start one.
 * @typedef {{ build: string }} BuildQuery
 */

/**
 * The token is the backend's to mint and this page only hands it back, so the
 * cap is a bound on what will be echoed into a URL rather than a format.
 */
const MAX_BUILD_TOKEN_LENGTH = 200

/**
 * A query key this page does not know is dropped rather than refused, so a
 * link a regulator was sent carrying a tracking parameter still opens the
 * page.
 */
export const buildQuerySchema = Joi.object({
  build: Joi.string()
    .trim()
    .max(MAX_BUILD_TOKEN_LENGTH)
    .truncate()
    .allow('')
    .default('')
}).options({ stripUnknown: true })
