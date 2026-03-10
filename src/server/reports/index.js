import { listController } from './list-controller.js'

const basePath =
  '/organisations/{organisationId}/registrations/{registrationId}/reports'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const reports = {
  plugin: {
    name: 'reports',
    register(server) {
      server.route([
        {
          ...listController,
          method: 'GET',
          path: basePath
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
