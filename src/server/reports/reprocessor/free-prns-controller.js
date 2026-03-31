import Joi from 'joi'

import { fetchReportDetail } from '../helpers/fetch-report-detail.js'
import { periodParamsSchema } from '../helpers/period-params-schema.js'
import { updateReport } from '../helpers/update-report.js'
import { buildValidationErrors } from '../helpers/validation.js'
import { getRedirectUrl } from '../helpers/redirect.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

const payloadSchema = Joi.object({
  freeTonnage: Joi.number().min(0).required().messages({
    'any.required': 'reports:reprocessorFreePrnErrorRequired',
    'number.base': 'reports:reprocessorFreePrnErrorRequired',
    'number.min': 'reports:reprocessorFreePrnErrorNegative',
    'number.unsafe': 'reports:reprocessorFreePrnErrorFormat',
    'number.infinity': 'reports:reprocessorFreePrnErrorFormat'
  }),
  action: Joi.string().valid('continue', 'save').required(),
  crumb: Joi.string()
})

const VIEW_PATH = 'reports/reprocessor/free-prns'

/**
 * @param {{ periodLabel: string, periodPath: string, reportDetail: object }} ctx
 */
function pageFields({ periodLabel, periodPath, reportDetail }) {
  return (localise) => ({
    pageTitle: localise('reports:reprocessorFreePrnPageTitle', {
      material: undefined,
      periodLabel
    }),
    caption: localise('reports:reprocessorFreePrnCaption'),
    heading: localise('reports:reprocessorFreePrnHeading', { periodLabel }),
    hintText: localise('reports:reprocessorFreePrnHint'),
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
  return buildReprocessorViewData(
    request,
    (ctx) => {
      const fields = pageFields(ctx)(request.t)
      fields.backUrl = request.localiseUrl(fields.backUrl)
      return fields
    },
    { ...options, accreditedOnly: true }
  )
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const reprocessorFreePrnsGetController = {
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
export const reprocessorFreePrnsPostController = {
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
      const message = localise('reports:reprocessorFreePrnErrorExceedsTotal')

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
