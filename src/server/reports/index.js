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
  prnSummaryDispatchGetController,
  prnSummaryDispatchPostController
} from './prn-summary-dispatcher.js'
import { listController } from './list-controller.js'
import {
  tonnesRecycledGetController,
  tonnesRecycledPostController
} from './reprocessor/tonnes-recycled-controller.js'
import {
  tonnesNotRecycledGetController,
  tonnesNotRecycledPostController
} from './reprocessor/tonnes-not-recycled-controller.js'
import {
  tonnesNotExportedGetController,
  tonnesNotExportedPostController
} from './exporter/tonnes-not-exported-controller.js'
import {
  reprocessorFreePrnsGetController,
  reprocessorFreePrnsPostController
} from './reprocessor/free-prns-controller.js'
import {
  submitGetController,
  submitPostController
} from './submit-controller.js'
import { submittedController } from './submitted-controller.js'
import {
  supportingInformationGetController,
  supportingInformationPostController
} from './supporting-information-controller.js'
import { viewGetController } from './view-controller.js'

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
          ...prnSummaryDispatchGetController,
          method: 'GET',
          path: `${periodPath}/prn-summary`
        },
        {
          ...prnSummaryDispatchPostController,
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
          ...reprocessorFreePrnsGetController,
          method: 'GET',
          path: `${periodPath}/free-prns`
        },
        {
          ...reprocessorFreePrnsPostController,
          method: 'POST',
          path: `${periodPath}/free-prns`
        },
        {
          ...tonnesRecycledGetController,
          method: 'GET',
          path: `${periodPath}/tonnes-recycled`
        },
        {
          ...tonnesRecycledPostController,
          method: 'POST',
          path: `${periodPath}/tonnes-recycled`
        },
        {
          ...tonnesNotRecycledGetController,
          method: 'GET',
          path: `${periodPath}/tonnes-not-recycled`
        },
        {
          ...tonnesNotRecycledPostController,
          method: 'POST',
          path: `${periodPath}/tonnes-not-recycled`
        },
        {
          ...tonnesNotExportedGetController,
          method: 'GET',
          path: `${periodPath}/tonnes-not-exported`
        },
        {
          ...tonnesNotExportedPostController,
          method: 'POST',
          path: `${periodPath}/tonnes-not-exported`
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
          ...submitGetController,
          method: 'GET',
          path: `${periodPath}/submit`
        },
        {
          ...submitPostController,
          method: 'POST',
          path: `${periodPath}/submit`
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
        },
        {
          ...viewGetController,
          method: 'GET',
          path: `${periodPath}/view`
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
