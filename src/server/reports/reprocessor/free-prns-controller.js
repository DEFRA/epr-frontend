import Joi from 'joi'

import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

const { getController, postController } = createDataPageControllers({
  viewPath: 'reports/tonnage-input',
  fieldName: 'freeTonnage',
  payloadSchema: Joi.object({
    freeTonnage: Joi.number().min(0).required().messages({
      'any.required': 'reports:freeErrorRequired',
      'number.base': 'reports:freeErrorRequired',
      'number.min': 'reports:freeErrorNegative',
      'number.unsafe': 'reports:freeErrorFormat',
      'number.infinity': 'reports:freeErrorFormat'
    }),
    action: Joi.string().valid('continue', 'save').required(),
    crumb: Joi.string()
  }),
  pageFields({ periodLabel, periodPath, registration, reportDetail }) {
    const { noteTypePlural } = getNoteTypeDisplayNames(registration)
    return (localise) => ({
      noteTypePlural,
      pageTitle: localise('reports:freePageTitle', {
        noteTypePlural,
        material: undefined,
        periodLabel
      }),
      caption: localise('reports:freeCaption'),
      heading: localise('reports:freeHeading', { noteTypePlural, periodLabel }),
      hintText: localise('reports:freeHint', { noteTypePlural }),
      continueText: localise('reports:freeContinue'),
      saveText: localise('reports:freeSave'),
      fieldName: 'freeTonnage',
      backUrl: `${periodPath}/prn-summary`,
      tonnageIssued: reportDetail.prn.issuedTonnage,
      defaultValue: reportDetail.prn.freeTonnage
    })
  },
  guardFn: buildReprocessorViewData,
  guardOptions: { accreditedOnly: true },
  nextPage: 'supporting-information',
  exceedsTotalErrorKey: 'reports:freeErrorExceedsTotal'
})

export {
  getController as reprocessorFreePrnsGetController,
  postController as reprocessorFreePrnsPostController
}
