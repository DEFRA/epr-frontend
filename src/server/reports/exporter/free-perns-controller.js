import Joi from 'joi'

import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { buildExporterViewData } from './exporter-page-guards.js'

const { getController, postController } = createDataPageControllers({
  viewPath: 'reports/tonnage-input',
  fieldName: 'freeTonnage',
  payloadSchema: Joi.object({
    freeTonnage: Joi.number().min(0).required().messages({
      'any.required': 'reports:freePernErrorRequired',
      'number.base': 'reports:freePernErrorRequired',
      'number.min': 'reports:freePernErrorFormat',
      'number.unsafe': 'reports:freePernErrorFormat'
    }),
    action: Joi.string().valid('continue', 'save').required(),
    crumb: Joi.string()
  }),
  pageFields({ periodLabel, periodPath, reportDetail }) {
    return (localise) => ({
      pageTitle: localise('reports:freePernPageTitle', {
        material: undefined,
        periodLabel
      }),
      caption: localise('reports:freePernCaption'),
      heading: localise('reports:freePernHeading', { periodLabel }),
      hintText: localise('reports:freePernHint'),
      continueText: localise('reports:freePernContinue'),
      saveText: localise('reports:freePernSave'),
      fieldName: 'freeTonnage',
      backUrl: `${periodPath}/prn-summary`,
      tonnageIssued: reportDetail.prn.issuedTonnage,
      defaultValue: reportDetail.prn.freeTonnage
    })
  },
  guardFn: buildExporterViewData,
  nextPage: 'supporting-information',
  exceedsTotalErrorKey: 'reports:freePernErrorExceedsTotal'
})

export {
  getController as freePernGetController,
  postController as freePernPostController
}
