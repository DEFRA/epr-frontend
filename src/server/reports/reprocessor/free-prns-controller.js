import Joi from 'joi'

import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

const { getController, postController } = createDataPageControllers({
  viewPath: 'reports/tonnage-input',
  fieldName: 'freeTonnage',
  payloadSchema: Joi.object({
    freeTonnage: Joi.number().min(0).required().messages({
      'any.required': 'reports:reprocessorFreePrnErrorRequired',
      'number.base': 'reports:reprocessorFreePrnErrorRequired',
      'number.min': 'reports:reprocessorFreePrnErrorNegative',
      'number.unsafe': 'reports:reprocessorFreePrnErrorFormat',
      'number.infinity': 'reports:reprocessorFreePrnErrorFormat'
    }),
    action: Joi.string().valid('continue', 'save').required(),
    crumb: Joi.string()
  }),
  pageFields({ periodLabel, periodPath, reportDetail }) {
    return (localise) => ({
      pageTitle: localise('reports:reprocessorFreePrnPageTitle', {
        material: undefined,
        periodLabel
      }),
      caption: localise('reports:reprocessorFreePrnCaption'),
      heading: localise('reports:reprocessorFreePrnHeading', { periodLabel }),
      hintText: localise('reports:reprocessorFreePrnHint'),
      continueText: localise('reports:reprocessorFreePrnContinue'),
      saveText: localise('reports:reprocessorFreePrnSave'),
      fieldName: 'freeTonnage',
      backUrl: `${periodPath}/prn-summary`,
      tonnageIssued: reportDetail.prn.issuedTonnage,
      defaultValue: reportDetail.prn.freeTonnage
    })
  },
  guardFn: buildReprocessorViewData,
  guardOptions: { accreditedOnly: true },
  nextPage: 'supporting-information',
  exceedsTotalErrorKey: 'reports:reprocessorFreePrnErrorExceedsTotal'
})

export {
  getController as reprocessorFreePrnsGetController,
  postController as reprocessorFreePrnsPostController
}
