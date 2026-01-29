import { checkController, checkPostController } from './check-controller.js'
import { controller } from './controller.js'
import { listController } from './list-controller.js'
import { postController } from './post-controller.js'
import { viewController } from './view-controller.js'

const basePath =
  '/organisations/{organisationId}/registrations/{registrationId}/packaging-recycling-notes'

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
          path: basePath
        },
        {
          ...controller,
          method: 'GET',
          path: `${basePath}/create`
        },
        {
          ...postController,
          method: 'POST',
          path: `${basePath}/create`
        },
        {
          ...checkController,
          method: 'GET',
          path: `${basePath}/{prnId}/check`
        },
        {
          ...checkPostController,
          method: 'POST',
          path: `${basePath}/{prnId}/check`
        },
        {
          ...viewController,
          method: 'GET',
          path: `${basePath}/{prnId}/view`
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
