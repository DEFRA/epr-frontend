import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'

import { createDataPageControllers } from './create-data-page-controllers.js'
import { freeTonnagePayloadSchema } from './validation.js'

/**
 * @import { GuardFn, PageFieldsBuilder } from './create-page-guards.js'
 */

/** @type {PageFieldsBuilder} */
const pageFields = ({
  material,
  periodLabel,
  periodShort,
  periodPath,
  registration,
  reportDetail
}) => {
  const { noteTypePlural } = getNoteTypeDisplayNames(registration)
  const prn = /** @type {NonNullable<typeof reportDetail.prn>} */ (
    reportDetail.prn
  )

  return (localise) => ({
    backUrl: `${periodPath}/prn-summary`,
    caption: localise('reports:createDraftReportCaption'),
    continueText: localise('reports:freeContinue'),
    defaultValue: prn.freeTonnage,
    fieldName: 'freeTonnage',
    heading: localise('reports:freeHeading', {
      noteTypePlural,
      periodShort
    }),
    inputHint: localise('reports:freeInputHint'),
    inputLabel: localise('reports:freeInputLabel', {
      noteTypePlural
    }),
    insetText: localise('reports:freeHint', {
      noteTypePlural
    }),
    noteTypePlural,
    pageTitle: localise('reports:freePageTitle', {
      noteTypePlural,
      material,
      periodLabel
    }),
    saveText: localise('reports:freeSave'),
    tonnageIssued: prn.issuedTonnage
  })
}

/**
 * Creates the free-tonnage GET/POST controller pair, parameterised by the
 * guard function. The exporter and reprocessor subtrees both consume this
 * factory; the only runtime difference is which guard is used.
 * @param {{ guardFn: GuardFn }} options
 */
export const createFreeTonnageControllers = ({ guardFn }) =>
  createDataPageControllers({
    exceedsTotalErrorKey: 'reports:freeErrorExceedsTotal',
    fieldName: 'freeTonnage',
    guardFn,
    guardOptions: {
      accreditedOnly: true
    },
    nextPage: 'supporting-information',
    pageFields,
    payloadSchema: freeTonnagePayloadSchema,
    viewPath: 'reports/tonnage-input'
  })
