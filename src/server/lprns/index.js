import { actionController } from './action-controller.js'
import {
  cancelGetController,
  cancelPostController
} from './cancel-controller.js'
import { controller } from './controller.js'
import { createdController } from './created-controller.js'
import {
  deleteGetController,
  deletePostController
} from './delete-controller.js'
import {
  discardGetController,
  discardPostController
} from './discard-controller.js'
import { issueController } from './issue-controller.js'
import { issuedController } from './issued-controller.js'
import { listController } from './list-controller.js'
import { postController } from './post-controller.js'
import { viewController, viewPostController } from './view-controller.js'

const basePath =
  '/organisations/{organisationId}/registrations/{registrationId}/accreditations/{accreditationId}/packaging-recycling-notes'

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
          ...actionController,
          method: 'GET',
          path: `${basePath}/{prnId}`
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
          ...deleteGetController,
          method: 'GET',
          path: `${basePath}/{prnId}/delete`
        },
        {
          ...deletePostController,
          method: 'POST',
          path: `${basePath}/{prnId}/delete`
        },
        {
          ...discardGetController,
          method: 'GET',
          path: `${basePath}/{prnId}/discard`
        },
        {
          ...discardPostController,
          method: 'POST',
          path: `${basePath}/{prnId}/discard`
        },
        {
          ...cancelGetController,
          method: 'GET',
          path: `${basePath}/{prnId}/cancel`
        },
        {
          ...cancelPostController,
          method: 'POST',
          path: `${basePath}/{prnId}/cancel`
        },
        {
          ...issueController,
          method: 'POST',
          path: `${basePath}/{prnId}/issue`
        },
        {
          ...issuedController,
          method: 'GET',
          path: `${basePath}/{prnId}/issued`
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
