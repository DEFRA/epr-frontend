import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import {
  padToTwoDecimalPlaces,
  revenuePayloadSchema
} from '../helpers/validation.js'
import { buildExporterViewData } from './exporter-page-guards.js'

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
      backUrl: periodPath,
      defaultValue: padToTwoDecimalPlaces(reportDetail.prn.totalRevenue)
    })
  },
  guardFn: buildExporterViewData,
  nextPage: 'free-perns'
})

export {
  getController as prnSummaryGetController,
  postController as prnSummaryPostController
}
