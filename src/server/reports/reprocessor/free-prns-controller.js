import Joi from 'joi'

import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { fetchReportDetail } from '../helpers/fetch-report-detail.js'
import { getRedirectUrl } from '../helpers/redirect.js'
import { updateReport } from '../helpers/update-report.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

const { getController, postController } = createDataPageControllers({
  viewPath: 'reports/tonnage-input',
  fieldName: 'freeTonnage',
  payloadSchema: Joi.object({
    freeTonnage: Joi.number().min(0).required().messages({
      'any.required': 'reports:reprocessorFreePrnErrorRequired',
      'number.base': 'reports:reprocessorFreePrnErrorRequired',
      'number.min': 'reports:reprocessorFreePrnErrorNegative',
      'number.unsafe': 'reports:reprocessorFreePrnErrorFormat',
      'number.infinity': 'reports:reprocessorFreePrnErrorFormat'
    }),
    action: Joi.string().valid('continue', 'save').required(),
    crumb: Joi.string()
  }),
  pageFields({ periodLabel, periodPath, reportDetail }) {
    return (localise) => ({
      pageTitle: localise('reports:reprocessorFreePrnPageTitle', {
        material: undefined,
        periodLabel
      }),
      caption: localise('reports:reprocessorFreePrnCaption'),
      heading: localise('reports:reprocessorFreePrnHeading', { periodLabel }),
      hintText: localise('reports:reprocessorFreePrnHint'),
      continueText: localise('reports:reprocessorFreePrnContinue'),
      saveText: localise('reports:reprocessorFreePrnSave'),
      fieldName: 'freeTonnage',
      backUrl: `${periodPath}/prn-summary`,
      tonnageIssued: reportDetail.prn.issuedTonnage,
      defaultValue: reportDetail.prn.freeTonnage
    })
  },
  guardFn: buildReprocessorViewData,
  guardOptions: { accreditedOnly: true },
  createPostHandler({ getViewData, viewPath }) {
    return async (request, h) => {
      const { organisationId, registrationId, year, cadence, period } =
        request.params
      const { freeTonnage, action } = request.payload
      const session = request.auth.credentials

      const reportDetail = await fetchReportDetail(
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        session.idToken
      )

      if (freeTonnage > reportDetail.prn.issuedTonnage) {
        const message = request.t('reports:reprocessorFreePrnErrorExceedsTotal')

        const viewData = await getViewData(request, {
          value: freeTonnage,
          errors: {
            freeTonnage: { text: message }
          },
          errorSummary: {
            titleText: request.t('common:errorSummaryTitle'),
            errorList: [{ text: message, href: '#freeTonnage' }]
          }
        })

        return h.view(viewPath, viewData)
      }

      await updateReport(
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        { freeTonnage },
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
  getController as reprocessorFreePrnsGetController,
  postController as reprocessorFreePrnsPostController
}
