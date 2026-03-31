import Joi from 'joi'

import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { getRedirectUrl } from '../helpers/redirect.js'
import { updateReport } from '../helpers/update-report.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

const FIELD_NAME = 'tonnageRecycled'

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

const VIEW_PATH = 'reports/tonnage-input'

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
    continueText: localise('reports:tonnageRecycledContinue'),
    saveText: localise('reports:tonnageRecycledSave'),
    fieldName: FIELD_NAME,
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

const { getController, postController } = createDataPageControllers({
  viewPath: VIEW_PATH,
  fieldName: FIELD_NAME,
  payloadSchema,
  buildViewData,
  async postHandler(request, h) {
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
})

export {
  getController as tonnesRecycledGetController,
  postController as tonnesRecycledPostController
}

/**
 * @import { Request, ServerRoute } from '@hapi/hapi'
 */
