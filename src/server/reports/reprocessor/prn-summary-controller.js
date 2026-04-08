import Joi from 'joi'

import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { maxTwoDecimalPlaces } from '../helpers/validation.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

const FORMAT_ERROR = 'reports:noteSummaryErrorFormat'

const { getController, postController } = createDataPageControllers({
  viewPath: 'reports/prn-summary',
  fieldName: 'prnRevenue',
  payloadSchema: Joi.object({
    prnRevenue: Joi.number()
      .min(0)
      .custom(maxTwoDecimalPlaces)
      .required()
      .messages({
        'any.required': 'reports:noteSummaryErrorRequired',
        'number.base': 'reports:noteSummaryErrorRequired',
        'number.min': FORMAT_ERROR,
        'number.unsafe': FORMAT_ERROR,
        'number.infinity': FORMAT_ERROR,
        'number.maxDecimalPlaces': 'reports:noteSummaryErrorDecimalPlaces'
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
