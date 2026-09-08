import { readsAsARegulator } from '#server/auth/reads-as-a-regulator.js'
import { controller as regulatorListController } from '#server/registrations/details/accreditations/packaging-recycling-notes/controller.js'

import { actionController } from './action-controller.js'
import {
  cancelGetController,
  cancelPostController
} from './cancel-controller.js'
import { cancelledController } from './cancelled-controller.js'
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
 * One address, two audiences. The address names an accreditation's notes, and
 * who is reading does not change what it names — so a regulator gets a page
 * written for them here rather than at an address of its own.
 *
 * Only this route forks. Create, view, delete, discard, cancel and issue are
 * untouched, so a regulator reaching one of those lands where they land today.
 * With `featureFlags.regulatorAccess` off, `readsAsARegulator` is false for
 * everyone and every session gets the operator's list, which is what keeps the
 * operator journey unchanged.
 *
 * It is also what makes the note page's back link right for a regulator with no
 * change to `view-controller.js`: that link points here, and here is now their
 * page.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
const listRoute = {
  /**
   * @param {HapiRequest & { params: PrnListParams }} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    return readsAsARegulator(request.auth.credentials)
      ? regulatorListController.handler(request, h)
      : listController.handler(request, h)
  }
}

export const prns = {
  plugin: {
    name: 'prns',
    register(server) {
      server.route([
        {
          ...listRoute,
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
          ...cancelledController,
          method: 'GET',
          path: `${basePath}/{prnId}/cancelled`
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
 * @import { ResponseToolkit, ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PrnListParams } from './helpers/session-types.js'
 */
