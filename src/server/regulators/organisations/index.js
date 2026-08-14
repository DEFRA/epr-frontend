import { SCOPES } from '#server/auth/scopes.js'
import { paths } from '#server/paths.js'

import { controller } from './controller.js'

/**
 * Regulator organisations plugin
 * Registers the organisation search a regulator reaches from their landing
 * page. The regulators plugin registers this one, so both live behind the
 * feature flag that gates regulator sign-in.
 */
export const regulatorOrganisations = {
  plugin: {
    name: 'regulator-organisations',
    register(server) {
      server.route([
        {
          ...controller,
          method: 'GET',
          path: paths.regulators.organisations,
          options: {
            ...controller.options,
            auth: { scope: [SCOPES.organisationSearch] }
          }
        }
      ])
    }
  }
}
