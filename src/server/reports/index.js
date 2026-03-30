import { checkGetController, checkPostController } from './check-controller.js'
import { createController } from './create-controller.js'
import { createdController } from './created-controller.js'
import {
  deleteGetController,
  deletePostController
} from './delete-controller.js'
import { detailController } from './detail-controller.js'
import {
  freePernGetController,
  freePernPostController
} from './exporter/free-perns-controller.js'
import {
  prnSummaryGetController,
  prnSummaryPostController
} from './exporter/prn-summary-controller.js'
import { listController } from './list-controller.js'
import { submittedController } from './submitted-controller.js'
import {
  supportingInformationGetController,
  supportingInformationPostController
} from './supporting-information-controller.js'

const basePath =
  '/organisations/{organisationId}/registrations/{registrationId}/reports'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const reports = {
  plugin: {
    name: 'reports',
    register(server) {
      const periodPath = `${basePath}/{year}/{cadence}/{period}`

      server.route([
        {
          ...listController,
          method: 'GET',
          path: basePath
        },
        {
          ...detailController,
          method: 'GET',
          path: periodPath
        },
        {
          ...createController,
          method: 'POST',
          path: periodPath
        },
        {
          ...prnSummaryGetController,
          method: 'GET',
          path: `${periodPath}/prn-summary`
        },
        {
          ...prnSummaryPostController,
          method: 'POST',
          path: `${periodPath}/prn-summary`
        },
        {
          ...freePernGetController,
          method: 'GET',
          path: `${periodPath}/free-perns`
        },
        {
          ...freePernPostController,
          method: 'POST',
          path: `${periodPath}/free-perns`
        },
        {
          ...supportingInformationGetController,
          method: 'GET',
          path: `${periodPath}/supporting-information`
        },
        {
          ...supportingInformationPostController,
          method: 'POST',
          path: `${periodPath}/supporting-information`
        },
        {
          ...checkGetController,
          method: 'GET',
          path: `${periodPath}/check-your-answers`
        },
        {
          ...checkPostController,
          method: 'POST',
          path: `${periodPath}/check-your-answers`
        },
        {
          ...createdController,
          method: 'GET',
          path: `${periodPath}/created`
        },
        {
          ...submittedController,
          method: 'GET',
          path: `${periodPath}/submitted`
        },
        {
          ...deleteGetController,
          method: 'GET',
          path: `${periodPath}/delete`
        },
        {
          ...deletePostController,
          method: 'POST',
          path: `${periodPath}/delete`
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
