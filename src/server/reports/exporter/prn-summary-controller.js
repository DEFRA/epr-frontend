import Joi from 'joi'

import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { buildExporterViewData } from './exporter-page-guards.js'

const FORMAT_ERROR = 'reports:noteSummaryErrorFormat'

const { getController, postController } = createDataPageControllers({
  viewPath: 'reports/prn-summary',
  fieldName: 'prnRevenue',
  payloadSchema: Joi.object({
    prnRevenue: Joi.number().min(0).required().messages({
      'any.required': 'reports:noteSummaryErrorRequired',
      'number.base': 'reports:noteSummaryErrorRequired',
      'number.min': FORMAT_ERROR,
      'number.unsafe': FORMAT_ERROR,
      'number.infinity': FORMAT_ERROR
    }),
    action: Joi.string().valid('continue', 'save').required(),
    crumb: Joi.string()
  }),
  pageFields({
    material,
    periodLabel,
    periodPath,
    registration,
    reportDetail
  }) {
    const { noteTypePlural } = getNoteTypeDisplayNames(registration)
    return (localise) => ({
      noteTypePlural,
      pageTitle: localise('reports:noteSummaryPageTitle', {
        noteTypePlural,
        material,
        periodLabel
      }),
      caption: localise('reports:noteSummaryCaption'),
      heading: localise('reports:noteSummaryHeading', {
        noteTypePlural,
        material,
        periodLabel
      }),
      tonnageLabel: localise('reports:totalIssuedTonnage', { noteTypePlural }),
      tonnageIssued: reportDetail.prn.issuedTonnage,
      revenueLabel: localise('reports:noteSummaryRevenueLabel', {
        noteTypePlural
      }),
      continueText: localise('reports:noteSummaryContinue'),
      saveText: localise('reports:noteSummarySave'),
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
