import Joi from 'joi'

import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { fetchReportDetail } from '../helpers/fetch-report-detail.js'
import { getRedirectUrl } from '../helpers/redirect.js'
import { updateReport } from '../helpers/update-report.js'
import { buildExporterViewData } from './exporter-page-guards.js'

const { getController, postController } = createDataPageControllers({
  viewPath: 'reports/tonnage-input',
  fieldName: 'freeTonnage',
  payloadSchema: Joi.object({
    freeTonnage: Joi.number().min(0).required().messages({
      'any.required': 'reports:freePernErrorRequired',
      'number.base': 'reports:freePernErrorRequired',
      'number.min': 'reports:freePernErrorFormat',
      'number.unsafe': 'reports:freePernErrorFormat'
    }),
    action: Joi.string().valid('continue', 'save').required(),
    crumb: Joi.string()
  }),
  pageFields({ periodLabel, periodPath, reportDetail }) {
    return (localise) => ({
      pageTitle: localise('reports:freePernPageTitle', {
        material: undefined,
        periodLabel
      }),
      caption: localise('reports:freePernCaption'),
      heading: localise('reports:freePernHeading', { periodLabel }),
      hintText: localise('reports:freePernHint'),
      continueText: localise('reports:freePernContinue'),
      saveText: localise('reports:freePernSave'),
      fieldName: 'freeTonnage',
      backUrl: `${periodPath}/prn-summary`,
      tonnageIssued: reportDetail.prn.issuedTonnage,
      defaultValue: reportDetail.prn.freeTonnage
    })
  },
  guardFn: buildExporterViewData,
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
        const message = request.t('reports:freePernErrorExceedsTotal')

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
  getController as freePernGetController,
  postController as freePernPostController
}
