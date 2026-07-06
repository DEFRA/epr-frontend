import { checkGetController, checkPostController } from './check-controller.js'
import { createController } from './create-controller.js'
import { createdController } from './created-controller.js'
import {
  deleteGetController,
  deletePostController
} from './delete-controller.js'
import { detailController } from './detail-controller.js'
import { resubmissionExplainerController } from './resubmission-explainer-controller.js'
import {
  exporterFreePernGetController,
  exporterFreePernPostController
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
import {
  summaryLogChangedErrorGetController,
  summaryLogChangedErrorPostController
} from './summary-log-changed-error-controller.js'
import { SummaryLogChangedError } from './helpers/summary-log-changed.js'

const INVALIDATION_ERROR_ROUTES = Object.freeze({
  summary_log_changed: 'summary-log-changed-error'
})

const basePath =
  '/organisations/{organisationId}/registrations/{registrationId}/reports'

export const reports = {
  plugin: {
    name: 'reports',
    register(server) {
      const periodPath = `${basePath}/{year}/{cadence}/{period}/submissions/{submissionNumber}`

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
          ...resubmissionExplainerController,
          method: 'GET',
          path: `${periodPath}/resubmission-explainer`
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
          ...exporterFreePernGetController,
          method: 'GET',
          path: `${periodPath}/free-perns`
        },
        {
          ...exporterFreePernPostController,
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
        },
        {
          ...summaryLogChangedErrorGetController,
          method: 'GET',
          path: `${periodPath}/summary-log-changed-error`
        },
        {
          ...summaryLogChangedErrorPostController,
          method: 'POST',
          path: `${periodPath}/summary-log-changed-error`
        }
      ])

      server.ext({
        type: 'onPreResponse',
        method(request, h) {
          if (!(request.response instanceof SummaryLogChangedError)) {
            return h.continue
          }
          const errorRoute = INVALIDATION_ERROR_ROUTES[request.response.reason]
          if (!errorRoute) {
            return h.continue
          }
          const {
            organisationId,
            registrationId,
            year,
            cadence,
            period,
            submissionNumber
          } = request.params
          const base = `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}/submissions/${submissionNumber}`
          request.yar.set('summaryLogChangedError', base)
          return h.redirect(request.localiseUrl(`${base}/${errorRoute}`))
        },
        options: { before: '@hapi/yar' }
      })
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
