import { controller } from './controller.js'
import { checkDetailsController } from './check-details-controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const prns = {
  plugin: {
    name: 'prns',
    register(server) {
      server.route([
        {
          ...controller,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/create-prn'
        },
        {
          ...checkDetailsController,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/create-prn/check-details'
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
