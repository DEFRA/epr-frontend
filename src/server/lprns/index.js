import { controller } from './controller.js'
import { createdController } from './created-controller.js'
import { issueController } from './issue-controller.js'
import { listController } from './list-controller.js'
import { postController } from './post-controller.js'
import { viewController, viewPostController } from './view-controller.js'

const basePath =
  '/organisations/{organisationId}/registrations/{registrationId}/accreditations/{accreditationId}/l-packaging-recycling-notes'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const lprns = {
  plugin: {
    name: 'lprns',
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
          ...viewController,
          method: 'GET',
          path: `${basePath}/{prnId}/view`
        },
        {
          ...viewPostController,
          method: 'POST',
          path: `${basePath}/{prnId}/view`
        },
        {
          ...createdController,
          method: 'GET',
          path: `${basePath}/{prnId}/created`
        },
        {
          ...issueController,
          method: 'POST',
          path: `${basePath}/{prnId}/issue`
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
