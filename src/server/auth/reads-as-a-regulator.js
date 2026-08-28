import { config } from '#config/config.js'
import { isRegulator } from '#server/auth/roles.js'

/**
 * @param {{ role?: string | null } | null} [credentials]
 * @returns {boolean}
 */
export const readsAsARegulator = (credentials) =>
  config.get('featureFlags.regulatorAccess') && isRegulator(credentials)
