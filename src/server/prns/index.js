import { checkController, checkPostController } from './check-controller.js'
import { controller } from './controller.js'
import { postController } from './post-controller.js'
import { successController } from './success-controller.js'

const basePath =
  '/organisations/{organisationId}/registrations/{registrationId}/create-prn'

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
          path: basePath
        },
        {
          ...postController,
          method: 'POST',
          path: basePath
        },
        {
          ...checkController,
          method: 'GET',
          path: `${basePath}/check`
        },
        {
          ...checkPostController,
          method: 'POST',
          path: `${basePath}/check`
        },
        {
          ...successController,
          method: 'GET',
          path: `${basePath}/success`
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
