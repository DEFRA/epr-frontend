import { CADENCE } from '../constants.js'
import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { tonnageNotRecycledPayloadSchema } from '../helpers/validation.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

/**
 * @import { PageFieldsBuilder } from '../helpers/create-page-guards.js'
 */

/** @type {PageFieldsBuilder} */
const pageFields =
  ({ material, periodLabel, periodShort, periodPath, reportDetail }) =>
  (localise) => ({
    backUrl: `${periodPath}/tonnes-recycled`,
    caption: localise('reports:createDraftReportCaption'),
    continueText: localise('reports:tonnageNotRecycledContinue'),
    defaultValue: reportDetail.recyclingActivity?.tonnageNotRecycled,
    fieldName: 'tonnageNotRecycled',
    heading: localise('reports:tonnageNotRecycledHeading', {
      material: material.toLowerCase(),
      periodShort
    }),
    hintText: localise('reports:tonnageNotRecycledHint'),
    pageTitle: localise('reports:tonnageNotRecycledPageTitle', {
      material,
      periodLabel
    }),
    saveText: localise('reports:tonnageNotRecycledSave')
  })

const { getController, postController } = createDataPageControllers({
  fieldName: 'tonnageNotRecycled',
  guardFn: buildReprocessorViewData,
  nextPage: ({ params }) =>
    params.cadence === CADENCE.MONTHLY
      ? 'prn-summary'
      : 'supporting-information',
  pageFields,
  payloadSchema: tonnageNotRecycledPayloadSchema,
  viewPath: 'reports/tonnage-input'
})

export {
  getController as tonnesNotRecycledGetController,
  postController as tonnesNotRecycledPostController
}
