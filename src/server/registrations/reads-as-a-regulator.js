import { config } from '#config/config.js'
import { isRegulator } from '#server/auth/roles.js'

/**
 * The registration route serves the operator too, so it is registered whatever
 * the flag says. Every other regulator surface is a plugin the router leaves
 * out when the flag is off, and this is the one place that cannot be, so the
 * flag is read here.
 * @param {{ role?: string | null } | null} [credentials]
 * @returns {boolean}
 */
export const readsAsARegulator = (credentials) =>
  config.get('featureFlags.regulatorAccess') && isRegulator(credentials)
