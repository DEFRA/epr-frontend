import Joi from 'joi'

import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { buildExporterViewData } from './exporter-page-guards.js'

const FORMAT_ERROR = 'reports:prnSummaryErrorFormat'

const { getController, postController } = createDataPageControllers({
  viewPath: 'reports/prn-summary',
  fieldName: 'prnRevenue',
  payloadSchema: Joi.object({
    prnRevenue: Joi.number().min(0).required().messages({
      'any.required': 'reports:prnSummaryErrorRequired',
      'number.base': 'reports:prnSummaryErrorRequired',
      'number.min': FORMAT_ERROR,
      'number.unsafe': FORMAT_ERROR,
      'number.infinity': FORMAT_ERROR
    }),
    action: Joi.string().valid('continue', 'save').required(),
    crumb: Joi.string()
  }),
  pageFields({ material, periodLabel, periodPath, reportDetail }) {
    return (localise) => ({
      pageTitle: localise('reports:prnSummaryPageTitle', {
        material,
        periodLabel
      }),
      caption: localise('reports:prnSummaryCaption'),
      heading: localise('reports:prnSummaryHeading', { material, periodLabel }),
      tonnageLabel: localise('reports:prnSummaryTonnageLabel'),
      tonnageIssued: reportDetail.prn.issuedTonnage,
      revenueLabel: localise('reports:prnSummaryRevenueLabel'),
      continueText: localise('reports:prnSummaryContinue'),
      saveText: localise('reports:prnSummarySave'),
      backUrl: periodPath,
      defaultValue: reportDetail.prn.totalRevenue
    })
  },
  guardFn: buildExporterViewData,
  nextPage: 'free-perns'
})

export {
  getController as prnSummaryGetController,
  postController as prnSummaryPostController
}
