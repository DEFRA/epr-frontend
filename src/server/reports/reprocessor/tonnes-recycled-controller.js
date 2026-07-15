import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { tonnageRecycledPayloadSchema } from '../helpers/validation.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

/**
 * @import { PageFieldsBuilder } from '../helpers/create-page-guards.js'
 */

/** @type {PageFieldsBuilder} */
const pageFields =
  ({ material, periodLabel, periodShort, reportsListPath, reportDetail }) =>
  (localise) => ({
    backUrl: reportsListPath,
    caption: localise('reports:createDraftReportCaption'),
    continueText: localise('reports:tonnageRecycledContinue'),
    defaultValue: reportDetail.recyclingActivity?.tonnageRecycled,
    fieldName: 'tonnageRecycled',
    heading: localise('reports:tonnageRecycledHeading', {
      material: material.toLowerCase(),
      periodShort
    }),
    hintText: localise('reports:tonnageRecycledHint', { periodLabel }),
    pageTitle: localise('reports:tonnageRecycledPageTitle', {
      material,
      periodLabel
    }),
    saveText: localise('reports:tonnageRecycledSave')
  })

const { getController, postController } = createDataPageControllers({
  fieldName: 'tonnageRecycled',
  guardFn: buildReprocessorViewData,
  nextPage: 'tonnes-not-recycled',
  pageFields,
  payloadSchema: tonnageRecycledPayloadSchema,
  viewPath: 'reports/tonnage-input'
})

export {
  getController as tonnesRecycledGetController,
  postController as tonnesRecycledPostController
}
