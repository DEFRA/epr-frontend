import Joi from 'joi'

import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { fetchReportDetail } from '../helpers/fetch-report-detail.js'
import { getRedirectUrl } from '../helpers/redirect.js'
import { updateReport } from '../helpers/update-report.js'
import { buildExporterViewData } from './exporter-page-guards.js'

const FIELD_NAME = 'freeTonnage'

const payloadSchema = Joi.object({
  freeTonnage: Joi.number().min(0).required().messages({
    'any.required': 'reports:freePernErrorRequired',
    'number.base': 'reports:freePernErrorRequired',
    'number.min': 'reports:freePernErrorFormat',
    'number.unsafe': 'reports:freePernErrorFormat'
  }),
  action: Joi.string().valid('continue', 'save').required(),
  crumb: Joi.string()
})

const VIEW_PATH = 'reports/tonnage-input'

/**
 * @param {{ periodLabel: string, periodPath: string, reportDetail: object }} ctx
 */
function pageFields({ periodLabel, periodPath, reportDetail }) {
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
    fieldName: FIELD_NAME,
    backUrl: `${periodPath}/prn-summary`,
    tonnageIssued: reportDetail.prn.issuedTonnage,
    defaultValue: reportDetail.prn.freeTonnage
  })
}

/**
 * @param {Request} request
 * @param {object} [options]
 */
async function buildViewData(request, options = {}) {
  return buildExporterViewData(
    request,
    (ctx) => {
      const fields = pageFields(ctx)(request.t)
      fields.backUrl = request.localiseUrl(fields.backUrl)
      return fields
    },
    options
  )
}

const { getController, postController } = createDataPageControllers({
  viewPath: VIEW_PATH,
  fieldName: FIELD_NAME,
  payloadSchema,
  buildViewData,
  async postHandler(request, h) {
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

    const tonnageIssued = reportDetail.prn.issuedTonnage

    if (freeTonnage > tonnageIssued) {
      const { t: localise } = request
      const message = localise('reports:freePernErrorExceedsTotal')

      const viewData = await buildViewData(request, {
        value: freeTonnage,
        errors: {
          freeTonnage: { text: message }
        },
        errorSummary: {
          titleText: localise('common:errorSummaryTitle'),
          errorList: [{ text: message, href: '#freeTonnage' }]
        }
      })

      return h.view(VIEW_PATH, viewData)
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
      getRedirectUrl(request, request.params, action, 'supporting-information')
    )
  }
})

export {
  getController as freePernGetController,
  postController as freePernPostController
}

/**
 * @import { Request, ServerRoute } from '@hapi/hapi'
 */
