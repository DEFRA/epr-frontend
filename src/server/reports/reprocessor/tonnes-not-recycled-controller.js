import Joi from 'joi'

import { CADENCE } from '../constants.js'
import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { maxTwoDecimalPlaces } from '../helpers/validation.js'
import { getRedirectUrl } from '../helpers/redirect.js'
import { updateReport } from '../helpers/update-report.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

const { getController, postController } = createDataPageControllers({
  viewPath: 'reports/tonnage-input',
  fieldName: 'tonnageNotRecycled',
  payloadSchema: Joi.object({
    tonnageNotRecycled: Joi.number()
      .empty('')
      .min(0)
      .custom(maxTwoDecimalPlaces)
      .required()
      .messages({
        'any.required': 'reports:tonnageNotRecycledErrorRequired',
        'number.base': 'reports:tonnageNotRecycledErrorFormat',
        'number.min': 'reports:tonnageNotRecycledErrorNegative',
        'number.unsafe': 'reports:tonnageNotRecycledErrorFormat',
        'number.infinity': 'reports:tonnageNotRecycledErrorFormat',
        'number.maxDecimalPlaces':
          'reports:tonnageNotRecycledErrorDecimalPlaces'
      }),
    action: Joi.string().valid('continue', 'save').required(),
    crumb: Joi.string()
  }),
  pageFields({ material, periodLabel, periodPath, reportDetail }) {
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
      fieldName: 'tonnageNotRecycled',
      backUrl: `${periodPath}/tonnes-recycled`,
      defaultValue: reportDetail.recyclingActivity?.tonnageNotRecycled
    })
  },
  guardFn: buildReprocessorViewData,
  createPostHandler() {
    return async (request, h) => {
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

      return h.redirect(
        getRedirectUrl(request, request.params, action, nextPage)
      )
    }
  }
})

export {
  getController as tonnesNotRecycledGetController,
  postController as tonnesNotRecycledPostController
}
