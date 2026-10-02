import { config } from '#config/config.js'
import { seesRegulatorView } from '#server/auth/roles.js'

/**
 * Read-only: admins pass too, so never gate a write on it.
 * @param {{ role?: string | null } | null} [credentials]
 * @returns {boolean}
 */
export const readsAsARegulator = (credentials) =>
  config.get('featureFlags.regulatorAccess') && seesRegulatorView(credentials)
