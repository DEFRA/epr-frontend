import Joi from 'joi'

import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { formatPeriodLabel } from '../helpers/format-period-label.js'
import { periodParamsSchema } from '../helpers/period-params-schema.js'
import { updateReport } from '../helpers/update-report.js'
import {
  fetchGuardedExporterData,
  buildValidationErrors,
  getRedirectUrl
} from './exporter-page-guards.js'

const payloadSchema = Joi.object({
  prnRevenue: Joi.number().min(0).required().messages({
    'any.required': 'reports:prnSummaryErrorRequired',
    'number.base': 'reports:prnSummaryErrorRequired',
    'number.min': 'reports:prnSummaryErrorFormat',
    'number.unsafe': 'reports:prnSummaryErrorFormat',
    'number.infinity': 'reports:prnSummaryErrorFormat'
  }),
  action: Joi.string().valid('continue', 'save').required(),
  crumb: Joi.string()
})

const VIEW_PATH = 'reports/exporter/prn-summary'

/**
 * @param {Request} request
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {number} year
 * @param {string} cadence
 * @param {number} period
 * @param {object} [options]
 * @param {string} [options.value] - Pre-fill value for revenue input
 * @param {object} [options.errors] - Validation errors
 * @param {object} [options.errorSummary] - Error summary for govukErrorSummary
 */
async function buildViewData(
  request,
  organisationId,
  registrationId,
  year,
  cadence,
  period,
  options = {}
) {
  const { t: localise } = request

  const { registration, reportDetail } = await fetchGuardedExporterData(
    request,
    organisationId,
    registrationId,
    year,
    cadence,
    period
  )

  const material = getDisplayMaterial(registration)
  const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)
  const periodPath = `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}`

  return {
    pageTitle: localise('reports:prnSummaryPageTitle', {
      material,
      periodLabel
    }),
    caption: localise('reports:prnSummaryCaption'),
    heading: localise('reports:prnSummaryHeading', { material, periodLabel }),
    tonnageLabel: localise('reports:prnSummaryTonnageLabel'),
    tonnageIssued: reportDetail.prn.issuedTonnage,
    revenueLabel: localise('reports:prnSummaryRevenueLabel'),
    backUrl: request.localiseUrl(periodPath),
    deleteUrl: request.localiseUrl(`${periodPath}/delete`),
    value: options.value ?? reportDetail.prn.totalRevenue ?? '',
    errors: options.errors ?? null,
    errorSummary: options.errorSummary ?? null
  }
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
    const { organisationId, registrationId, year, cadence, period } =
      request.params

    const viewData = await buildViewData(
      request,
      organisationId,
      registrationId,
      year,
      cadence,
      period
    )

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
        const { organisationId, registrationId, year, cadence, period } =
          request.params

        const { errors, errorSummary } = buildValidationErrors(request, error)

        const viewData = await buildViewData(
          request,
          organisationId,
          registrationId,
          year,
          cadence,
          period,
          {
            value: request.payload.prnRevenue,
            errors,
            errorSummary
          }
        )

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
