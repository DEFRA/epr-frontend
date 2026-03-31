import Joi from 'joi'

import { periodParamsSchema } from '../helpers/period-params-schema.js'
import { updateReport } from '../helpers/update-report.js'
import { buildValidationErrors } from '../helpers/validation.js'
import { getRedirectUrl } from '../helpers/redirect.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

const payloadSchema = Joi.object({
  tonnageRecycled: Joi.number().min(0).required().messages({
    'any.required': 'reports:tonnageRecycledErrorRequired',
    'number.base': 'reports:tonnageRecycledErrorRequired',
    'number.min': 'reports:tonnageRecycledErrorNegative',
    'number.unsafe': 'reports:tonnageRecycledErrorFormat',
    'number.infinity': 'reports:tonnageRecycledErrorFormat'
  }),
  action: Joi.string().valid('continue', 'save').required(),
  crumb: Joi.string()
})

const VIEW_PATH = 'reports/reprocessor/tonnes-recycled'

/**
 * @param {{ material: string, periodLabel: string, periodPath: string, reportDetail: object }} ctx
 */
function pageFields({ material, periodLabel, periodPath, reportDetail }) {
  return (localise) => ({
    pageTitle: localise('reports:tonnageRecycledPageTitle', {
      material,
      periodLabel
    }),
    caption: localise('reports:tonnageRecycledCaption'),
    heading: localise('reports:tonnageRecycledHeading', {
      material,
      periodLabel
    }),
    hintText: localise('reports:tonnageRecycledHint', { periodLabel }),
    backUrl: periodPath,
    defaultValue: reportDetail.recyclingActivity?.tonnageRecycled
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
    options
  )
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const tonnesRecycledGetController = {
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
export const tonnesRecycledPostController = {
  options: {
    validate: {
      params: periodParamsSchema,
      payload: payloadSchema,
      async failAction(request, h, error) {
        const { errors, errorSummary } = buildValidationErrors(request, error)

        const viewData = await buildViewData(request, {
          value: request.payload.tonnageRecycled,
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
    const { tonnageRecycled, action } = request.payload
    const session = request.auth.credentials

    await updateReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      { tonnageRecycled },
      session.idToken
    )

    return h.redirect(
      getRedirectUrl(request, request.params, action, 'tonnes-not-recycled')
    )
  }
}

/**
 * @import { Request, ServerRoute } from '@hapi/hapi'
 */
