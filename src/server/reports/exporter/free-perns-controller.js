import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { freeTonnagePayloadSchema } from '../helpers/validation.js'
import { buildExporterViewData } from './exporter-page-guards.js'

const { getController, postController } = createDataPageControllers({
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
      heading: localise('reports:freeHeading', { noteTypePlural, periodShort }),
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
  guardFn: buildExporterViewData,
  nextPage: 'supporting-information',
  exceedsTotalErrorKey: 'reports:freeErrorExceedsTotal'
})

export {
  getController as freePernGetController,
  postController as freePernPostController
}
