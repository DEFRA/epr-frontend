import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { tonnageNotExportedPayloadSchema } from '../helpers/validation.js'
import { getRedirectUrl } from '../helpers/redirect.js'
import { updateReport } from '../helpers/update-report.js'
import { buildExporterViewData } from './exporter-page-guards.js'

const { getController, postController } = createDataPageControllers({
  viewPath: 'reports/tonnage-input',
  fieldName: 'tonnageNotExported',
  payloadSchema: tonnageNotExportedPayloadSchema,
  pageFields({ material, periodLabel, periodPath, period, reportDetail }) {
    return (localise) => ({
      pageTitle: localise('reports:tonnageNotExportedPageTitle', {
        material,
        periodLabel
      }),
      caption: localise('reports:tonnageNotExportedCaption'),
      heading: localise('reports:tonnageNotExportedHeading', {
        material: material.toLowerCase(),
        quarter: period
      }),
      hintText: localise('reports:tonnageNotExportedHint'),
      continueText: localise('reports:tonnageNotExportedContinue'),
      saveText: localise('reports:tonnageNotExportedSave'),
      fieldName: 'tonnageNotExported',
      backUrl: periodPath,
      defaultValue: reportDetail.exportActivity?.tonnageReceivedNotExported
    })
  },
  guardFn: buildExporterViewData,
  guardOptions: { registeredOnly: true },
  createPostHandler() {
    return async (request, h) => {
      const { organisationId, registrationId, year, cadence, period } =
        request.params
      const { tonnageNotExported, action } = request.payload
      const session = request.auth.credentials

      await updateReport(
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        { tonnageNotExported },
        session.idToken
      )

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
