import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'

import { createDataPageControllers } from './create-data-page-controllers.js'
import { padToTwoDecimalPlaces, revenuePayloadSchema } from './validation.js'

/**
 * @import { BackUrlBuilder, GuardFn, PageFieldsBuilder } from './create-page-guards.js'
 */

/**
 * @param {BackUrlBuilder} getBackUrl
 * @returns {PageFieldsBuilder}
 */
const createPageFields = (getBackUrl) => (ctx) => {
  const { material, periodLabel, periodShort, registration, reportDetail } = ctx
  const { noteTypePlural } = getNoteTypeDisplayNames(registration)
  const prn = /** @type {NonNullable<typeof reportDetail.prn>} */ (
    reportDetail.prn
  )

  return (localise) => ({
    backUrl: getBackUrl(ctx),
    caption: localise('reports:createDraftReportCaption'),
    continueText: localise('reports:noteSummaryContinue'),
    defaultValue: padToTwoDecimalPlaces(prn.totalRevenue),
    heading: localise('reports:noteSummaryHeading', {
      material: material.toLowerCase(),
      noteTypePlural,
      periodShort
    }),
    noteTypePlural,
    pageTitle: localise('reports:noteSummaryPageTitle', {
      material,
      noteTypePlural,
      periodLabel
    }),
    revenueHint: localise('reports:noteSummaryRevenueHint'),
    revenueLabel: localise('reports:noteSummaryRevenueLabel', {
      noteTypePlural
    }),
    saveText: localise('reports:noteSummarySave'),
    tonnageIssued: prn.issuedTonnage,
    tonnageLabel: localise('reports:totalIssuedTonnage', { noteTypePlural })
  })
}

/**
 * Creates the prn-summary GET/POST controller pair, parameterised by the
 * guard function and the page's back-link target. The exporter and
 * reprocessor subtrees both consume this factory.
 * @param {{
 *   getBackUrl: BackUrlBuilder,
 *   guardFn: GuardFn,
 *   nextPage: string
 * }} options
 */
export const createPrnSummaryControllers = ({
  getBackUrl,
  guardFn,
  nextPage
}) =>
  createDataPageControllers({
    fieldName: 'prnRevenue',
    guardFn,
    guardOptions: { accreditedOnly: true },
    nextPage,
    pageFields: createPageFields(getBackUrl),
    payloadSchema: revenuePayloadSchema,
    viewPath: 'reports/prn-summary'
  })
