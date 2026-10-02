import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
import Joi from 'joi'

/**
 * The backend's answer to "who is this identity, and what may it do?".
 *
 * `role` says who the user is and drives where they land and what the page
 * calls them. `scopes` say what they may do, and every guard derives from
 * them. An identity the backend does not recognise gets `{ role: null,
 * scopes: [] }`.
 *
 * The scopes are the durable ones, held by the identity itself. An operator's
 * access to a named organisation is granted per request by the backend and
 * never appears here.
 * @typedef {{
 *   role: string | null
 *   scopes: string[]
 * }} Identity
 */

const identitySchema = Joi.object({
  role: Joi.string().allow(null).required(),
  scopes: Joi.array().items(Joi.string()).required()
}).unknown(true)

/**
 * @param {unknown} payload
 * @returns {Identity}
 */
const validateIdentity = (payload) => {
  const { error, value } = identitySchema.validate(payload, {
    abortEarly: false
  })

  if (error) {
    const details = error.details
      .map((d) => `${d.path.join('.')}: ${d.message}`)
      .join('; ')
    throw new Error(`Invalid identity: ${details}`)
  }

  return value
}

/**
 * Asks the backend who the signed-in identity is. The backend holds the only
 * mapping from an identity to a set of scopes, so this app never reads a role
 * claim to answer the question itself.
 * @param {string} backendToken
 * @returns {Promise<Identity>}
 */
export async function fetchIdentity(backendToken) {
  const data = await fetchJsonFromBackend('/v1/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${backendToken}`
    }
  })

  return validateIdentity(data)
}
