import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import {
  padToTwoDecimalPlaces,
  revenuePayloadSchema
} from '../helpers/validation.js'
import { buildExporterViewData } from './exporter-page-guards.js'

/**
 * @import { PageFieldsBuilder } from '../helpers/create-page-guards.js'
 */

/** @type {PageFieldsBuilder} */
const pageFields = ({
  material,
  periodLabel,
  periodShort,
  reportsListPath,
  registration,
  reportDetail
}) => {
  const { noteTypePlural } = getNoteTypeDisplayNames(registration)
  const prn = /** @type {NonNullable<typeof reportDetail.prn>} */ (
    reportDetail.prn
  )

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
      periodShort
    }),
    tonnageLabel: localise('reports:totalIssuedTonnage', { noteTypePlural }),
    tonnageIssued: prn.issuedTonnage,
    revenueLabel: localise('reports:noteSummaryRevenueLabel', {
      noteTypePlural
    }),
    revenueHint: localise('reports:noteSummaryRevenueHint'),
    continueText: localise('reports:noteSummaryContinue'),
    saveText: localise('reports:noteSummarySave'),
    backUrl: reportsListPath,
    defaultValue: padToTwoDecimalPlaces(prn.totalRevenue)
  })
}

const { getController, postController } = createDataPageControllers({
  viewPath: 'reports/prn-summary',
  fieldName: 'prnRevenue',
  payloadSchema: revenuePayloadSchema,
  pageFields,
  guardFn: buildExporterViewData,
  guardOptions: { accreditedOnly: true },
  nextPage: 'free-perns'
})

export {
  getController as prnSummaryGetController,
  postController as prnSummaryPostController
}
