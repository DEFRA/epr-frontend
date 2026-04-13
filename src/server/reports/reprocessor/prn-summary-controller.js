import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import {
  padToTwoDecimalPlaces,
  revenuePayloadSchema
} from '../helpers/validation.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

const { getController, postController } = createDataPageControllers({
  viewPath: 'reports/prn-summary',
  fieldName: 'prnRevenue',
  payloadSchema: revenuePayloadSchema,
  pageFields({
    material,
    periodLabel,
    periodMonth,
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
        material: material.toLowerCase(),
        periodMonth
      }),
      tonnageLabel: localise('reports:totalIssuedTonnage', { noteTypePlural }),
      tonnageIssued: reportDetail.prn.issuedTonnage,
      revenueLabel: localise('reports:noteSummaryRevenueLabel', {
        noteTypePlural
      }),
      revenueHint: localise('reports:noteSummaryRevenueHint'),
      continueText: localise('reports:noteSummaryContinue'),
      saveText: localise('reports:noteSummarySave'),
      backUrl: `${periodPath}/tonnes-not-recycled`,
      defaultValue: padToTwoDecimalPlaces(reportDetail.prn.totalRevenue)
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
