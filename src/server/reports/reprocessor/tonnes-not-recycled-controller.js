import { CADENCE } from '../constants.js'
import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import {
  formatToTwoDecimalPlaces,
  tonnageNotRecycledPayloadSchema
} from '../helpers/validation.js'
import { getRedirectUrl } from '../helpers/redirect.js'
import { updateReport } from '../helpers/update-report.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

const { getController, postController } = createDataPageControllers({
  viewPath: 'reports/tonnage-input',
  fieldName: 'tonnageNotRecycled',
  payloadSchema: tonnageNotRecycledPayloadSchema,
  pageFields({ material, periodLabel, periodPath, reportDetail }) {
    return (localise) => ({
      pageTitle: localise('reports:tonnageNotRecycledPageTitle', {
        material,
        periodLabel
      }),
      caption: localise('reports:tonnageNotRecycledCaption'),
      heading: localise('reports:tonnageNotRecycledHeading', {
        material,
        periodLabel
      }),
      hintText: localise('reports:tonnageNotRecycledHint'),
      continueText: localise('reports:tonnageNotRecycledContinue'),
      saveText: localise('reports:tonnageNotRecycledSave'),
      fieldName: 'tonnageNotRecycled',
      backUrl: `${periodPath}/tonnes-recycled`,
      defaultValue: formatToTwoDecimalPlaces(
        reportDetail.recyclingActivity?.tonnageNotRecycled
      )
    })
  },
  guardFn: buildReprocessorViewData,
  createPostHandler() {
    return async (request, h) => {
      const { organisationId, registrationId, year, cadence, period } =
        request.params
      const { tonnageNotRecycled, action } = request.payload
      const session = request.auth.credentials

      await updateReport(
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        { tonnageNotRecycled },
        session.idToken
      )

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
