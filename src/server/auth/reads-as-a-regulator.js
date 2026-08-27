import { config } from '#config/config.js'
import { isRegulator } from '#server/auth/roles.js'

/**
 * The organisation and registration routes serve the operator too, so they are
 * registered whatever the flag says. Every other regulator surface is a plugin
 * the router leaves out when the flag is off, and these are the routes that
 * cannot be, so the flag is read here.
 * @param {{ role?: string | null } | null} [credentials]
 * @returns {boolean}
 */
export const readsAsARegulator = (credentials) =>
  config.get('featureFlags.regulatorAccess') && isRegulator(credentials)
