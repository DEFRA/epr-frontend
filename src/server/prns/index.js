import { checkController, checkPostController } from './check-controller.js'
import { controller } from './controller.js'
import { listController } from './list-controller.js'
import { postController } from './post-controller.js'
import { successController } from './success-controller.js'

const basePath =
  '/organisations/{organisationId}/registrations/{registrationId}/create-prn'
const listPath =
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
          path: listPath
        },
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
