import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { tonnageNotExportedPayloadSchema } from '../helpers/validation.js'
import { buildExporterViewData } from './exporter-page-guards.js'

/**
 * @import { PageFieldsBuilder } from '../helpers/create-page-guards.js'
 */

/** @type {PageFieldsBuilder} */
const pageFields =
  ({ material, periodLabel, reportsListPath, period, reportDetail }) =>
  (localise) => ({
    backUrl: reportsListPath,
    caption: localise('reports:tonnageNotExportedCaption'),
    continueText: localise('reports:tonnageNotExportedContinue'),
    defaultValue: reportDetail.exportActivity?.tonnageReceivedNotExported,
    fieldName: 'tonnageNotExported',
    heading: localise('reports:tonnageNotExportedHeading', {
      material: material.toLowerCase(),
      quarter: period
    }),
    hintText: localise('reports:tonnageNotExportedHint'),
    pageTitle: localise('reports:tonnageNotExportedPageTitle', {
      material,
      periodLabel
    }),
    saveText: localise('reports:tonnageNotExportedSave')
  })

const { getController, postController } = createDataPageControllers({
  fieldName: 'tonnageNotExported',
  guardFn: buildExporterViewData,
  guardOptions: { registeredOnly: true },
  nextPage: 'supporting-information',
  pageFields,
  payloadSchema: tonnageNotExportedPayloadSchema,
  viewPath: 'reports/tonnage-input'
})

export {
  getController as tonnesNotExportedGetController,
  postController as tonnesNotExportedPostController
}
