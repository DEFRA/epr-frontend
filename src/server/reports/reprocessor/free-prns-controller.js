import Joi from 'joi'

import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { fetchReportDetail } from '../helpers/fetch-report-detail.js'
import { getRedirectUrl } from '../helpers/redirect.js'
import { updateReport } from '../helpers/update-report.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

const FIELD_NAME = 'freeTonnage'

const payloadSchema = Joi.object({
  freeTonnage: Joi.number().min(0).required().messages({
    'any.required': 'reports:reprocessorFreePrnErrorRequired',
    'number.base': 'reports:reprocessorFreePrnErrorRequired',
    'number.min': 'reports:reprocessorFreePrnErrorNegative',
    'number.unsafe': 'reports:reprocessorFreePrnErrorFormat',
    'number.infinity': 'reports:reprocessorFreePrnErrorFormat'
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
    pageTitle: localise('reports:reprocessorFreePrnPageTitle', {
      material: undefined,
      periodLabel
    }),
    caption: localise('reports:reprocessorFreePrnCaption'),
    heading: localise('reports:reprocessorFreePrnHeading', { periodLabel }),
    hintText: localise('reports:reprocessorFreePrnHint'),
    continueText: localise('reports:reprocessorFreePrnContinue'),
    saveText: localise('reports:reprocessorFreePrnSave'),
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
  return buildReprocessorViewData(
    request,
    (ctx) => {
      const fields = pageFields(ctx)(request.t)
      fields.backUrl = request.localiseUrl(fields.backUrl)
      return fields
    },
    { ...options, accreditedOnly: true }
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
      const message = localise('reports:reprocessorFreePrnErrorExceedsTotal')

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
  getController as reprocessorFreePrnsGetController,
  postController as reprocessorFreePrnsPostController
}

/**
 * @import { Request, ServerRoute } from '@hapi/hapi'
 */
