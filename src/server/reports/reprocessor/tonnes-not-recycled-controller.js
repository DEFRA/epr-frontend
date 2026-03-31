import Joi from 'joi'

import { CADENCE } from '../constants.js'
import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { getRedirectUrl } from '../helpers/redirect.js'
import { updateReport } from '../helpers/update-report.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

const FIELD_NAME = 'tonnageNotRecycled'

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

const VIEW_PATH = 'reports/tonnage-input'

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
    continueText: localise('reports:tonnageNotRecycledContinue'),
    saveText: localise('reports:tonnageNotRecycledSave'),
    fieldName: FIELD_NAME,
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

const { getController, postController } = createDataPageControllers({
  viewPath: VIEW_PATH,
  fieldName: FIELD_NAME,
  payloadSchema,
  buildViewData,
  async postHandler(request, h) {
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
})

export {
  getController as tonnesNotRecycledGetController,
  postController as tonnesNotRecycledPostController
}

/**
 * @import { Request, ServerRoute } from '@hapi/hapi'
 */
