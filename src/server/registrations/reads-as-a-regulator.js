import { config } from '#config/config.js'
import { isRegulator } from '#server/auth/roles.js'

/**
 * Whether this session reads a registration as a regulator rather than as the
 * operator who holds it.
 *
 * A registration has one address, and who is looking at it decides what they
 * see. Which page a reader gets is a question about who they are, so it reads
 * the role rather than a scope, as `isRegulator` is written to answer. A scope
 * decides what a reader may reach once they are on a page, and the two
 * questions stay apart.
 *
 * The flag is read here rather than at plugin registration because the
 * registration route serves the operator too, so it is registered whatever the
 * flag says. Every other regulator surface is a plugin the router leaves out
 * when the flag is off, and this is the one place that cannot be.
 *
 * The test is positive: it asks whether the backend named this session a
 * regulator, never whether it failed to look like an operator. An identity the
 * backend does not recognise therefore reads as neither, which is what keeps a
 * role-less session out of the operator's journey.
 * @param {{ role?: string | null } | null} [credentials]
 * @returns {boolean}
 */
export const readsAsARegulator = (credentials) =>
  config.get('featureFlags.regulatorAccess') && isRegulator(credentials)
