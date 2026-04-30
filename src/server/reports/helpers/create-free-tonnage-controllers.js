import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'

import { createDataPageControllers } from './create-data-page-controllers.js'
import { freeTonnagePayloadSchema } from './validation.js'

/**
 * Creates the free-tonnage GET/POST controller pair, parameterised by the
 * guard function. The exporter and reprocessor subtrees both consume this
 * factory; the only runtime difference is which guard is used.
 * @param {object} options
 * @param {(request: object, buildPageFields: (ctx: object) => object, options: object) => Promise<object>} options.guardFn
 */
export function createFreeTonnageControllers({ guardFn }) {
  return createDataPageControllers({
    viewPath: 'reports/tonnage-input',
    fieldName: 'freeTonnage',
    payloadSchema: freeTonnagePayloadSchema,
    pageFields({
      material,
      periodLabel,
      periodShort,
      periodPath,
      registration,
      reportDetail
    }) {
      const { noteTypePlural } = getNoteTypeDisplayNames(registration)

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
        tonnageIssued: reportDetail.prn.issuedTonnage,
        defaultValue: reportDetail.prn.freeTonnage
      })
    },
    guardFn,
    guardOptions: { accreditedOnly: true },
    nextPage: 'supporting-information',
    exceedsTotalErrorKey: 'reports:freeErrorExceedsTotal'
  })
}
