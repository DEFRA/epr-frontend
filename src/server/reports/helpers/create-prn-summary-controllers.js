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
    backUrl: getBackUrl(ctx),
    defaultValue: padToTwoDecimalPlaces(prn.totalRevenue)
  })
}

/**
 * Creates the prn-summary GET/POST controller pair, parameterised by the
 * guard function and the page's back-link target. The exporter and
 * reprocessor subtrees both consume this factory.
 * @param {{
 *   guardFn: GuardFn,
 *   getBackUrl: BackUrlBuilder,
 *   nextPage: string
 * }} options
 */
export const createPrnSummaryControllers = ({
  guardFn,
  getBackUrl,
  nextPage
}) =>
  createDataPageControllers({
    viewPath: 'reports/prn-summary',
    fieldName: 'prnRevenue',
    payloadSchema: revenuePayloadSchema,
    pageFields: createPageFields(getBackUrl),
    guardFn,
    guardOptions: { accreditedOnly: true },
    nextPage
  })
