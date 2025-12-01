import { controller } from '#server/me/organisations/controller.js'

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const meOrganisations = {
  plugin: {
    name: 'me/organisations',
    register(server) {
      server.route({
        method: 'GET',
        path: '/me/organisations',
        ...controller
      })
    }
  }
}
