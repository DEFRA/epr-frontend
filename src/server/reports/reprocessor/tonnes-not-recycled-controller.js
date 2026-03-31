import Joi from 'joi'

import { periodParamsSchema } from '../helpers/period-params-schema.js'
import { updateReport } from '../helpers/update-report.js'
import { buildValidationErrors } from '../helpers/validation.js'
import { getRedirectUrl } from '../helpers/redirect.js'
import { CADENCE } from '../constants.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

const payloadSchema = Joi.object({
  tonnageNotRecycled: Joi.number().min(0).required().messages({
    'any.required': 'reports:tonnageNotRecycledErrorRequired',
    'number.base': 'reports:tonnageNotRecycledErrorRequired',
    'number.min': 'reports:tonnageNotRecycledErrorNegative',
    'number.unsafe': 'reports:tonnageNotRecycledErrorFormat',
    'number.infinity': 'reports:tonnageNotRecycledErrorFormat'
  }),
  action: Joi.string().valid('continue', 'save').required(),
  crumb: Joi.string()
})

const VIEW_PATH = 'reports/reprocessor/tonnes-not-recycled'

/**
 * @param {{ material: string, periodLabel: string, periodPath: string, reportDetail: object }} ctx
 */
function pageFields({ material, periodLabel, periodPath, reportDetail }) {
  return (localise) => ({
    pageTitle: localise('reports:tonnageNotRecycledPageTitle', {
      material,
      periodLabel
    }),
    caption: localise('reports:tonnageNotRecycledCaption'),
    heading: localise('reports:tonnageNotRecycledHeading', {
      material,
      periodLabel
    }),
    hintText: localise('reports:tonnageNotRecycledHint'),
    backUrl: `${periodPath}/tonnes-recycled`,
    defaultValue: reportDetail.recyclingActivity?.tonnageNotRecycled
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
export const tonnesNotRecycledGetController = {
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
export const tonnesNotRecycledPostController = {
  options: {
    validate: {
      params: periodParamsSchema,
      payload: payloadSchema,
      async failAction(request, h, error) {
        const { errors, errorSummary } = buildValidationErrors(request, error)

        const viewData = await buildViewData(request, {
          value: request.payload.tonnageNotRecycled,
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
    const { tonnageNotRecycled, action } = request.payload
    const session = request.auth.credentials

    await updateReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      { tonnageNotRecycled },
      session.idToken
    )

    const nextPage =
      cadence === CADENCE.MONTHLY ? 'prn-summary' : 'supporting-information'

    return h.redirect(getRedirectUrl(request, request.params, action, nextPage))
  }
}

/**
 * @import { Request, ServerRoute } from '@hapi/hapi'
 */
