import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'

import { createDataPageControllers } from './create-data-page-controllers.js'
import { freeTonnagePayloadSchema } from './validation.js'

/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { GuardOptions, PageFieldsBuilder, PageFieldsCtx, PageFieldsResult } from './create-page-guards.js'
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
    noteTypePlural,
    pageTitle: localise('reports:freePageTitle', {
      noteTypePlural,
      material,
      periodLabel
    }),
    caption: localise('reports:freeCaption'),
    heading: localise('reports:freeHeading', {
      noteTypePlural,
      periodShort
    }),
    insetText: localise('reports:freeHint', { noteTypePlural }),
    inputLabel: localise('reports:freeInputLabel', { noteTypePlural }),
    inputHint: localise('reports:freeInputHint'),
    continueText: localise('reports:freeContinue'),
    saveText: localise('reports:freeSave'),
    fieldName: 'freeTonnage',
    backUrl: `${periodPath}/prn-summary`,
    tonnageIssued: prn.issuedTonnage,
    defaultValue: prn.freeTonnage
  })
}

/**
 * Creates the free-tonnage GET/POST controller pair, parameterised by the
 * guard function. The exporter and reprocessor subtrees both consume this
 * factory; the only runtime difference is which guard is used.
 * @param {object} options
 * @param {(
 *   request: HapiRequest,
 *   buildPageFields: (ctx: PageFieldsCtx) => PageFieldsResult,
 *   options?: GuardOptions
 * ) => Promise<object>} options.guardFn
 */
export function createFreeTonnageControllers({ guardFn }) {
  return createDataPageControllers({
    viewPath: 'reports/tonnage-input',
    fieldName: 'freeTonnage',
    payloadSchema: freeTonnagePayloadSchema,
    pageFields,
    guardFn,
    guardOptions: { accreditedOnly: true },
    nextPage: 'supporting-information',
    exceedsTotalErrorKey: 'reports:freeErrorExceedsTotal'
  })
}
