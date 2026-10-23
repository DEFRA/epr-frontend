import Boom from '@hapi/boom'
import Joi from 'joi'

import { asHapiRequest } from '#server/common/hapi-types.js'
import { redirectPreservingMethod } from '#server/common/helpers/redirect-preserving-method.js'

import { checkGetController, checkPostController } from './check-controller.js'
import { createController } from './create-controller.js'
import { createdController } from './created-controller.js'
import {
  deleteGetController,
  deletePostController
} from './delete-controller.js'
import { detailController } from './detail-controller.js'
import {
  makeChangesGetController,
  makeChangesPostController
} from './make-changes-controller.js'
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
  reportStaleErrorGetController,
  reportStaleErrorPostController
} from './report-stale-error-controller.js'
import { reportDataIncompleteGetController } from './report-data-incomplete-controller.js'
import { ReportStaleError } from './helpers/stale.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { reportPath, reportsListPath } from './helpers/report-paths.js'
import { CADENCE } from './constants.js'

const registrationBase =
  '/organisations/{organisationNumber}/registrations/{registrationNumber}'
const listPath = `${registrationBase}/reports`
const submissionSuffix = '{cadence}/{period}/submissions/{submissionNumber}'

/**
 * The two report bases and the cadence each one serves.
 * @type {{ path: string, cadence: CadenceValue }[]}
 */
const REPORT_BASES = [
  {
    path: `${listPath}/{year}/${submissionSuffix}`,
    cadence: CADENCE.QUARTERLY
  },
  {
    path: `${registrationBase}/accreditations/{year}/reports/${submissionSuffix}`,
    cadence: CADENCE.MONTHLY
  }
]

/**
 * Every submission page, by method and suffix after the report base.
 * @type {{ controller: ReportPageController, method: string, suffix: string }[]}
 */
const SUBMISSION_ROUTES = [
  { controller: detailController, method: 'GET', suffix: '' },
  {
    controller: resubmissionExplainerController,
    method: 'GET',
    suffix: '/resubmission-explainer'
  },
  { controller: createController, method: 'POST', suffix: '' },
  {
    controller: prnSummaryDispatchGetController,
    method: 'GET',
    suffix: '/prn-summary'
  },
  {
    controller: prnSummaryDispatchPostController,
    method: 'POST',
    suffix: '/prn-summary'
  },
  {
    controller: exporterFreePernGetController,
    method: 'GET',
    suffix: '/free-perns'
  },
  {
    controller: exporterFreePernPostController,
    method: 'POST',
    suffix: '/free-perns'
  },
  {
    controller: reprocessorFreePrnsGetController,
    method: 'GET',
    suffix: '/free-prns'
  },
  {
    controller: reprocessorFreePrnsPostController,
    method: 'POST',
    suffix: '/free-prns'
  },
  {
    controller: tonnesRecycledGetController,
    method: 'GET',
    suffix: '/tonnes-recycled'
  },
  {
    controller: tonnesRecycledPostController,
    method: 'POST',
    suffix: '/tonnes-recycled'
  },
  {
    controller: tonnesNotRecycledGetController,
    method: 'GET',
    suffix: '/tonnes-not-recycled'
  },
  {
    controller: tonnesNotRecycledPostController,
    method: 'POST',
    suffix: '/tonnes-not-recycled'
  },
  {
    controller: tonnesNotExportedGetController,
    method: 'GET',
    suffix: '/tonnes-not-exported'
  },
  {
    controller: tonnesNotExportedPostController,
    method: 'POST',
    suffix: '/tonnes-not-exported'
  },
  {
    controller: supportingInformationGetController,
    method: 'GET',
    suffix: '/supporting-information'
  },
  {
    controller: supportingInformationPostController,
    method: 'POST',
    suffix: '/supporting-information'
  },
  {
    controller: checkGetController,
    method: 'GET',
    suffix: '/check-your-answers'
  },
  {
    controller: checkPostController,
    method: 'POST',
    suffix: '/check-your-answers'
  },
  { controller: submitGetController, method: 'GET', suffix: '/submit' },
  { controller: submitPostController, method: 'POST', suffix: '/submit' },
  { controller: createdController, method: 'GET', suffix: '/created' },
  { controller: submittedController, method: 'GET', suffix: '/submitted' },
  { controller: deleteGetController, method: 'GET', suffix: '/delete' },
  { controller: deletePostController, method: 'POST', suffix: '/delete' },
  { controller: viewGetController, method: 'GET', suffix: '/view' },
  {
    controller: makeChangesGetController,
    method: 'GET',
    suffix: '/make-changes'
  },
  {
    controller: makeChangesPostController,
    method: 'POST',
    suffix: '/make-changes'
  },
  {
    controller: reportStaleErrorGetController,
    method: 'GET',
    suffix: '/report-stale-error'
  },
  {
    controller: reportStaleErrorPostController,
    method: 'POST',
    suffix: '/report-stale-error'
  },
  {
    controller: reportDataIncompleteGetController,
    method: 'GET',
    suffix: '/report-data-incomplete'
  }
]

/**
 * A pre-handler that 404s a cadence the base does not serve.
 * @param {CadenceValue} cadence
 * @returns {RouteExtObject}
 */
const requireCadence = (cadence) => ({
  method(request, h) {
    if (request.params.cadence !== cadence) {
      throw Boom.notFound()
    }
    return h.continue
  }
})

/**
 * Registers each submission page under both report bases.
 * @returns {(ReportPageController & { method: string, path: string })[]}
 */
const submissionRoutes = () =>
  REPORT_BASES.flatMap((base) =>
    SUBMISSION_ROUTES.map(({ controller, method, suffix }) => ({
      ...controller,
      method,
      path: `${base.path}${suffix}`,
      options: {
        ...controller.options,
        ext: { onPreHandler: requireCadence(base.cadence) }
      }
    }))
  )

/**
 * Sends a monthly report URL on the registered-only base to the accredited base.
 * @type {ServerRoute}
 */
const monthlyToAccreditedRoute = {
  method: ['GET', 'POST'],
  path: `${listPath}/{year}/${CADENCE.MONTHLY}/{period}/submissions/{submissionNumber}/{rest*}`,
  options: {
    validate: {
      params: periodParamsSchema.keys({
        cadence: Joi.forbidden(),
        rest: Joi.string().allow('')
      })
    }
  },
  handler(rawRequest, h) {
    const request = asHapiRequest(rawRequest)
    const { rest, ...keys } = /** @type {MonthlyRedirectParams} */ (
      request.params
    )
    const suffix = rest ? `/${rest}` : ''
    const accreditedPath = reportPath({ ...keys, cadence: CADENCE.MONTHLY })

    return redirectPreservingMethod(request, h, `${accreditedPath}${suffix}`)
  }
}

/**
 * Sends the yearless report list address to the current year's list.
 * @type {ServerRoute}
 */
const currentYearListRoute = {
  method: 'GET',
  path: listPath,
  handler(rawRequest, h) {
    const request = asHapiRequest(rawRequest)
    const { organisationNumber, registrationNumber } =
      /** @type {RegistrationKeys} */ (request.params)

    return redirectPreservingMethod(
      request,
      h,
      reportsListPath({
        organisationNumber,
        registrationNumber,
        year: new Date().getUTCFullYear()
      })
    )
  }
}

export const reports = {
  plugin: {
    name: 'reports',
    register(server) {
      server.route([
        {
          ...listController,
          method: 'GET',
          path: `${listPath}/{year}`
        },
        currentYearListRoute,
        ...submissionRoutes(),
        monthlyToAccreditedRoute
      ])

      server.ext({
        type: 'onPreResponse',
        method(request, h) {
          if (!(request.response instanceof ReportStaleError)) {
            return h.continue
          }
          const { reasons } = request.response
          if (reasons.length === 0) {
            return h.continue
          }
          const periodPath = reportPath(request.params)
          request.yar.set('reportStaleErrorContext', { periodPath, reasons })
          return h.redirect(
            request.localiseUrl(`${periodPath}/report-stale-error`)
          )
        },
        options: {
          // Must run before boom-error-logger's onPreResponse, or that
          // extension logs the auto-boomified ReportStaleError as a spurious
          // 500 before this redirect ever replaces it (PAE-1973).
          before: ['boom-error-logger', '@hapi/yar']
        }
      })
    }
  }
}

/**
 * @import { RouteExtObject, ServerRegisterPluginObject, ServerRoute } from '@hapi/hapi'
 * @import { CadenceValue } from './constants.js'
 * @import { RegistrationKeys, SubmissionKeys } from './helpers/report-paths.js'
 */

/**
 * @typedef {{ options: object, handler: (request: never, h: never) => unknown }} ReportPageController
 * @typedef {Omit<SubmissionKeys, 'cadence'> & { rest?: string }} MonthlyRedirectParams
 */
