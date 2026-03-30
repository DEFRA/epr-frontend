import Joi from 'joi'

import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { fetchReportDetail } from '../helpers/fetch-report-detail.js'
import { formatPeriodLabel } from '../helpers/format-period-label.js'
import { periodParamsSchema } from '../helpers/period-params-schema.js'
import { updateReport } from '../helpers/update-report.js'
import {
  fetchGuardedExporterData,
  buildValidationErrors,
  getRedirectUrl
} from './exporter-page-guards.js'

const payloadSchema = Joi.object({
  freePernTonnage: Joi.number().min(0).required().messages({
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
 * @param {Request} request
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {number} year
 * @param {string} cadence
 * @param {number} period
 * @param {object} [options]
 * @param {string} [options.value] - Pre-fill value for tonnage input
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
    pageTitle: localise('reports:freePernPageTitle', {
      material,
      periodLabel
    }),
    caption: localise('reports:freePernCaption'),
    heading: localise('reports:freePernHeading', { periodLabel }),
    hintText: localise('reports:freePernHint'),
    backUrl: request.localiseUrl(`${periodPath}/prn-summary`),
    deleteUrl: request.localiseUrl(`${periodPath}/delete`),
    tonnageIssued: reportDetail.prn.issuedTonnage,
    value: options.value ?? reportDetail.prn.freeTonnage ?? '',
    errors: options.errors ?? null,
    errorSummary: options.errorSummary ?? null
  }
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
export const freePernPostController = {
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
            value: request.payload.freePernTonnage,
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
    const { freePernTonnage, action } = request.payload
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

    if (freePernTonnage > tonnageIssued) {
      const { t: localise } = request
      const message = localise('reports:freePernErrorExceedsTotal')

      const viewData = await buildViewData(
        request,
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        {
          value: freePernTonnage,
          errors: {
            freePernTonnage: { text: message }
          },
          errorSummary: {
            titleText: localise('common:errorSummaryTitle'),
            errorList: [{ text: message, href: '#freePernTonnage' }]
          }
        }
      )

      return h.view(VIEW_PATH, viewData)
    }

    await updateReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      { freePernTonnage },
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
