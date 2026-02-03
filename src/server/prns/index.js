import { confirmationController } from './issue-prn/confirmation/controller.js'
import { createController } from './create-prn/create/controller.js'
import { listController } from './view/list/controller.js'
import { checkDetailsController } from './create-prn/check-details/controller.js'
import { detailController } from './view/detail/controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const prns = {
  plugin: {
    name: 'prns',
    register(server) {
      server.route([
        // view
        {
          ...listController,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/prns'
        },
        {
          ...detailController,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/prns/{prnId}'
        },
        // create
        {
          ...createController,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/create-prn'
        },
        {
          ...checkDetailsController,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/create-prn/{prnId}/check-details'
        },
        // issue
        {
          ...confirmationController,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/issue-prn/{prnId}/confirmation'
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
