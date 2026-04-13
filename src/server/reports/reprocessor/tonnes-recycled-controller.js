import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { tonnageRecycledPayloadSchema } from '../helpers/validation.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

const { getController, postController } = createDataPageControllers({
  viewPath: 'reports/tonnage-input',
  fieldName: 'tonnageRecycled',
  payloadSchema: tonnageRecycledPayloadSchema,
  pageFields({ material, periodLabel, periodMonth, periodPath, reportDetail }) {
    return (localise) => ({
      pageTitle: localise('reports:tonnageRecycledPageTitle', {
        material,
        periodLabel
      }),
      caption: localise('reports:tonnageRecycledCaption'),
      heading: localise('reports:tonnageRecycledHeading', {
        material: material.toLowerCase(),
        periodMonth
      }),
      hintText: localise('reports:tonnageRecycledHint', { periodLabel }),
      continueText: localise('reports:tonnageRecycledContinue'),
      saveText: localise('reports:tonnageRecycledSave'),
      fieldName: 'tonnageRecycled',
      backUrl: periodPath,
      defaultValue: reportDetail.recyclingActivity?.tonnageRecycled
    })
  },
  guardFn: buildReprocessorViewData,
  nextPage: 'tonnes-not-recycled'
})

export {
  getController as tonnesRecycledGetController,
  postController as tonnesRecycledPostController
}
