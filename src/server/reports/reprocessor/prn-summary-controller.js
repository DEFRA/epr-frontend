import Joi from 'joi'

import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

const FORMAT_ERROR = 'reports:reprocessorPrnSummaryErrorFormat'

const { getController, postController } = createDataPageControllers({
  viewPath: 'reports/prn-summary',
  fieldName: 'prnRevenue',
  payloadSchema: Joi.object({
    prnRevenue: Joi.number().min(0).required().messages({
      'any.required': 'reports:reprocessorPrnSummaryErrorRequired',
      'number.base': 'reports:reprocessorPrnSummaryErrorRequired',
      'number.min': FORMAT_ERROR,
      'number.unsafe': FORMAT_ERROR,
      'number.infinity': FORMAT_ERROR
    }),
    action: Joi.string().valid('continue', 'save').required(),
    crumb: Joi.string()
  }),
  pageFields({ material, periodLabel, periodPath, reportDetail }) {
    return (localise) => ({
      pageTitle: localise('reports:reprocessorPrnSummaryPageTitle', {
        material,
        periodLabel
      }),
      caption: localise('reports:reprocessorPrnSummaryCaption'),
      heading: localise('reports:reprocessorPrnSummaryHeading', {
        material,
        periodLabel
      }),
      tonnageLabel: localise('reports:reprocessorPrnSummaryTonnageLabel'),
      tonnageIssued: reportDetail.prn.issuedTonnage,
      revenueLabel: localise('reports:reprocessorPrnSummaryRevenueLabel'),
      continueText: localise('reports:reprocessorPrnSummaryContinue'),
      saveText: localise('reports:reprocessorPrnSummarySave'),
      backUrl: `${periodPath}/tonnes-not-recycled`,
      defaultValue: reportDetail.prn.totalRevenue
    })
  },
  guardFn: buildReprocessorViewData,
  guardOptions: { accreditedOnly: true },
  nextPage: 'free-prns'
})

export {
  getController as reprocessorPrnSummaryGetController,
  postController as reprocessorPrnSummaryPostController
}
