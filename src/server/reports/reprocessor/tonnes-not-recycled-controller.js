import { CADENCE } from '../constants.js'
import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { getRedirectUrl } from '../helpers/redirect.js'
import { updateReport } from '../helpers/update-report.js'
import { tonnageNotRecycledPayloadSchema } from '../helpers/validation.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

/**
 * @import { DataPagePayload } from '../helpers/create-data-page-controllers.js'
 * @import { PageFieldsBuilder } from '../helpers/create-page-guards.js'
 */

/** @type {PageFieldsBuilder} */
const pageFields =
  ({ material, periodLabel, periodShort, periodPath, reportDetail }) =>
  (localise) => ({
    backUrl: `${periodPath}/tonnes-recycled`,
    caption: localise('reports:tonnageNotRecycledCaption'),
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
  pageFields,
  payloadSchema: tonnageNotRecycledPayloadSchema,
  viewPath: 'reports/tonnage-input',
  createPostHandler() {
    return async (request, h) => {
      const { tonnageNotRecycled, action } =
        /** @type {DataPagePayload & { tonnageNotRecycled?: number }} */ (
          request.payload
        )
      const { organisationId, registrationId, year, cadence, period } =
        request.params

      if (tonnageNotRecycled !== undefined) {
        await updateReport(
          organisationId,
          registrationId,
          year,
          cadence,
          period,
          { tonnageNotRecycled },
          request.auth.credentials.idToken
        )
      }

      const nextPage =
        cadence === CADENCE.MONTHLY ? 'prn-summary' : 'supporting-information'

      return h.redirect(
        getRedirectUrl(request, request.params, action, nextPage)
      )
    }
  }
})

export {
  getController as tonnesNotRecycledGetController,
  postController as tonnesNotRecycledPostController
}
