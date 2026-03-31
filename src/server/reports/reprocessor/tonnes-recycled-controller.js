import Joi from 'joi'

import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

const { getController, postController } = createDataPageControllers({
  viewPath: 'reports/tonnage-input',
  fieldName: 'tonnageRecycled',
  payloadSchema: Joi.object({
    tonnageRecycled: Joi.number().min(0).required().messages({
      'any.required': 'reports:tonnageRecycledErrorRequired',
      'number.base': 'reports:tonnageRecycledErrorRequired',
      'number.min': 'reports:tonnageRecycledErrorNegative',
      'number.unsafe': 'reports:tonnageRecycledErrorFormat',
      'number.infinity': 'reports:tonnageRecycledErrorFormat'
    }),
    action: Joi.string().valid('continue', 'save').required(),
    crumb: Joi.string()
  }),
  pageFields({ material, periodLabel, periodPath, reportDetail }) {
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
      fieldName: 'tonnageRecycled',
      backUrl: periodPath,
      defaultValue: reportDetail.recyclingActivity?.tonnageRecycled
    })
  },
  guardFn: buildReprocessorViewData,
  nextPage: 'tonnes-not-recycled'
})

export {
  getController as tonnesRecycledGetController,
  postController as tonnesRecycledPostController
}
