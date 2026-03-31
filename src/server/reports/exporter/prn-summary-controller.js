import Joi from 'joi'

import { periodParamsSchema } from '../helpers/period-params-schema.js'
import { updateReport } from '../helpers/update-report.js'
import {
  buildExporterViewData,
  buildValidationErrors,
  getRedirectUrl
} from './exporter-page-guards.js'

const FORMAT_ERROR = 'reports:prnSummaryErrorFormat'

const payloadSchema = Joi.object({
  prnRevenue: Joi.number().min(0).required().messages({
    'any.required': 'reports:prnSummaryErrorRequired',
    'number.base': 'reports:prnSummaryErrorRequired',
    'number.min': FORMAT_ERROR,
    'number.unsafe': FORMAT_ERROR,
    'number.infinity': FORMAT_ERROR
  }),
  action: Joi.string().valid('continue', 'save').required(),
  crumb: Joi.string()
})

const VIEW_PATH = 'reports/exporter/prn-summary'

/**
 * @param {{ material: string, periodLabel: string, periodPath: string, reportDetail: object }} ctx
 */
function pageFields({ material, periodLabel, periodPath, reportDetail }) {
  return (localise) => ({
    pageTitle: localise('reports:prnSummaryPageTitle', {
      material,
      periodLabel
    }),
    caption: localise('reports:prnSummaryCaption'),
    heading: localise('reports:prnSummaryHeading', { material, periodLabel }),
    tonnageLabel: localise('reports:prnSummaryTonnageLabel'),
    tonnageIssued: reportDetail.prn.issuedTonnage,
    revenueLabel: localise('reports:prnSummaryRevenueLabel'),
    backUrl: periodPath,
    defaultValue: reportDetail.prn.totalRevenue
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
export const prnSummaryGetController = {
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
export const prnSummaryPostController = {
  options: {
    validate: {
      params: periodParamsSchema,
      payload: payloadSchema,
      async failAction(request, h, error) {
        const { errors, errorSummary } = buildValidationErrors(request, error)

        const viewData = await buildViewData(request, {
          value: request.payload.prnRevenue,
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
    const { prnRevenue, action } = request.payload
    const session = request.auth.credentials

    await updateReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      { prnRevenue },
      session.idToken
    )

    return h.redirect(
      getRedirectUrl(request, request.params, action, 'free-perns')
    )
  }
}

/**
 * @import { Request, ServerRoute } from '@hapi/hapi'
 */
