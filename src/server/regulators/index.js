import { SCOPES } from '#server/auth/scopes.js'
import { paths } from '#server/paths.js'

import { regulatorOrganisations } from './organisations/index.js'

/**
 * Regulators plugin
 * Registers the post-login landing page for Entra ID authenticated regulators,
 * and the pages that page leads to.
 */
export const regulators = {
  plugin: {
    name: 'regulators',
    async register(server) {
      server.route([
        {
          /**
           * @param {HapiRequest} request
           * @param {ResponseToolkit} h
           */
          handler(request, h) {
            const { profile } = request.auth.credentials
            const username = profile.email?.split('@')[0]

            return h.view('regulators/home', {
              organisationsUrl: request.localiseUrl(
                paths.regulators.organisations
              ),
              pageTitle: request.t('regulators:home:pageTitle'),
              username
            })
          },
          method: 'GET',
          path: paths.regulators.home,
          options: {
            auth: { scope: [SCOPES.regulator] }
          }
        }
      ])

      await server.register([regulatorOrganisations])
    }
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */
