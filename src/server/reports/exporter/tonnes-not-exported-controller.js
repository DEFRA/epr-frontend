import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { getRedirectUrl } from '../helpers/redirect.js'
import { updateReport } from '../helpers/update-report.js'
import { tonnageNotExportedPayloadSchema } from '../helpers/validation.js'
import { buildExporterViewData } from './exporter-page-guards.js'

/**
 * @import { DataPagePayload } from '../helpers/create-data-page-controllers.js'
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
  pageFields,
  payloadSchema: tonnageNotExportedPayloadSchema,
  viewPath: 'reports/tonnage-input',
  createPostHandler() {
    return async (request, h) => {
      const { tonnageNotExported, action } =
        /** @type {DataPagePayload & { tonnageNotExported?: number }} */ (
          request.payload
        )

      if (tonnageNotExported !== undefined) {
        const { organisationId, registrationId, year, cadence, period } =
          request.params

        await updateReport(
          organisationId,
          registrationId,
          year,
          cadence,
          period,
          { tonnageNotExported },
          request.auth.credentials.idToken
        )
      }

      return h.redirect(
        getRedirectUrl(
          request,
          request.params,
          action,
          'supporting-information'
        )
      )
    }
  }
})

export {
  getController as tonnesNotExportedGetController,
  postController as tonnesNotExportedPostController
}
