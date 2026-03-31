import Joi from 'joi'

import { fetchReportDetail } from '../helpers/fetch-report-detail.js'
import { periodParamsSchema } from '../helpers/period-params-schema.js'
import { updateReport } from '../helpers/update-report.js'
import {
  buildExporterViewData,
  buildValidationErrors,
  getRedirectUrl
} from './exporter-page-guards.js'

const payloadSchema = Joi.object({
  freeTonnage: Joi.number().min(0).required().messages({
    'any.required': 'reports:freePernErrorRequired',
    'number.base': 'reports:freePernErrorRequired',
    'number.min': 'reports:freePernErrorFormat',
    'number.unsafe': 'reports:freePernErrorFormat'
  }),
  action: Joi.string().valid('continue', 'save').required(),
  crumb: Joi.string()
})

const VIEW_PATH = 'reports/exporter/free-perns'

/**
 * @param {{ periodLabel: string, periodPath: string, reportDetail: object }} ctx
 */
function pageFields({ periodLabel, periodPath, reportDetail }) {
  return (localise) => ({
    pageTitle: localise('reports:freePernPageTitle', {
      material: undefined,
      periodLabel
    }),
    caption: localise('reports:freePernCaption'),
    heading: localise('reports:freePernHeading', { periodLabel }),
    hintText: localise('reports:freePernHint'),
    backUrl: `${periodPath}/prn-summary`,
    tonnageIssued: reportDetail.prn.issuedTonnage,
    defaultValue: reportDetail.prn.freeTonnage
  })
}

/**
 * @param {Request} request
 * @param {object} [options]
 */
async function buildViewData(request, options = {}) {
  return buildExporterViewData(
    request,
    (ctx) => {
      const fields = pageFields(ctx)(request.t)
      fields.backUrl = request.localiseUrl(fields.backUrl)
      return fields
    },
    options
  )
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const freePernGetController = {
  options: {
    validate: {
      params: periodParamsSchema
    }
  },
  async handler(request, h) {
    const viewData = await buildViewData(request)
    return h.view(VIEW_PATH, viewData)
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const freePernPostController = {
  options: {
    validate: {
      params: periodParamsSchema,
      payload: payloadSchema,
      async failAction(request, h, error) {
        const { errors, errorSummary } = buildValidationErrors(request, error)

        const viewData = await buildViewData(request, {
          value: request.payload.freeTonnage,
          errors,
          errorSummary
        })

        return h.view(VIEW_PATH, viewData).takeover()
      }
    }
  },
  async handler(request, h) {
    const { organisationId, registrationId, year, cadence, period } =
      request.params
    const { freeTonnage, action } = request.payload
    const session = request.auth.credentials

    const reportDetail = await fetchReportDetail(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      session.idToken
    )

    const tonnageIssued = reportDetail.prn.issuedTonnage

    if (freeTonnage > tonnageIssued) {
      const { t: localise } = request
      const message = localise('reports:freePernErrorExceedsTotal')

      const viewData = await buildViewData(request, {
        value: freeTonnage,
        errors: {
          freeTonnage: { text: message }
        },
        errorSummary: {
          titleText: localise('common:errorSummaryTitle'),
          errorList: [{ text: message, href: '#freeTonnage' }]
        }
      })

      return h.view(VIEW_PATH, viewData)
    }

    await updateReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      { freeTonnage },
      session.idToken
    )

    return h.redirect(
      getRedirectUrl(request, request.params, action, 'supporting-information')
    )
  }
}

/**
 * @import { Request, ServerRoute } from '@hapi/hapi'
 */
