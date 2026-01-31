import { confirmationController } from './confirmation-controller.js'
import { createController } from './create-controller.js'
import { listController } from './list-controller.js'
import { checkDetailsController } from './check-details-controller.js'
import { detailController } from './detail-controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const prns = {
  plugin: {
    name: 'prns',
    register(server) {
      server.route([
        {
          ...listController,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/prns'
        },
        {
          ...createController,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/create-prn'
        },
        {
          ...checkDetailsController,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/create-prn/check-details'
        },
        {
          ...detailController,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/prns/{prnNumber}'
        },
        {
          ...confirmationController,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/prns/{prnNumber}/issue-confirmation'
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
