import { hasWriteScope } from '#server/auth/scopes.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { fetchRegistration } from '#server/common/helpers/organisations/fetch-registration.js'
import { defaultMaterialsHomepagePath } from '#server/common/helpers/organisations/registration-in-view.js'
import { redirectPreservingMethod } from '#server/common/helpers/redirect-preserving-method.js'
import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { JOURNEY } from '#server/common/helpers/metrics/constants.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import {
  paramsOrNotFound,
  yearParamsSchema
} from '#server/registrations/details/helpers/params-validation.js'
import {
  accreditationPath,
  registeredOnlyPath,
  registrationPath as toRegistrationPath,
  summaryLogUploadPathUnder
} from '#server/reports/helpers/report-paths.js'

const yearOrNotFound = paramsOrNotFound(yearParamsSchema, {
  message: 'Summary log upload not found',
  code: errorCodes.registrationNotFound,
  action: 'start_summary_log_upload',
  reason: 'the address holds no such organisation number or year'
})

/**
 * The upload page under one kind of materials homepage, which it links back to.
 * @param {{ accredited: boolean }} options
 * @returns {Partial<HapiServerRoute<HapiRequest>>}
 */
const summaryLogUploadController = ({ accredited }) => ({
  options: { validate: yearOrNotFound },
  /**
   * @param {HapiRequest & { params: RegistrationYearKeys }} request
   * @param {ResponseToolkit} h
   */
  handler: async (request, h) => {
    const localise = request.t
    const { year, ...keys } = request.params
    const { organisationNumber, registrationNumber } = keys
    const homepagePath = accredited
      ? accreditationPath({ ...keys, year })
      : registeredOnlyPath({ ...keys, year })

    const session = request.auth.credentials

    await fetchRegistration({ ...keys, backendToken: session.backendToken })

    try {
      // Starting an upload creates a summary log, so this GET writes. A session
      // holding no write scope reads the page without one; the form is hidden.
      const canUpload = hasWriteScope(session)

      const { uploadUrl } = canUpload
        ? await initiateSummaryLogUpload({
            keys,
            year,
            accredited,
            redirectUrl: `${toRegistrationPath(keys)}/summary-logs/{summaryLogId}`,
            backendToken: session.backendToken
          })
        : {}

      if (canUpload) {
        await metrics.journey.start(
          request,
          JOURNEY.uploadSummaryLog,
          registrationNumber
        )
      }

      return h.view('summary-log-upload/index', {
        pageTitle: localise('summary-log-upload:pageTitle', { year }),
        heading: localise('summary-log-upload:heading', { year }),
        caption: localise('summary-log-upload:caption'),
        introText: localise('summary-log-upload:introText'),
        uploadUrl,
        backUrl: request.localiseUrl(homepagePath)
      })
    } catch (err) {
      request.logger.error({
        message: 'Failed to initiate summary log upload',
        err,
        event: {
          category: 'upload',
          action: 'summary-log-upload-failed',
          reference: `organisationNumber=${organisationNumber}, registrationNumber=${registrationNumber}`
        }
      })

      return h.view('error/index', {
        pageTitle: localise('summary-log-upload:errorPageTitle'),
        heading: localise('summary-log-upload:errorHeading'),
        message: localise('summary-log-upload:errorGeneric')
      })
    }
  }
})

/**
 * Sends an address without a year on to the upload page under the materials
 * homepage the registration's own address would open.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
const summaryLogUploadRedirectController = {
  /**
   * @param {HapiRequest & { params: RegistrationKeys }} request
   * @param {ResponseToolkit} h
   */
  handler: async (request, h) => {
    const keys = request.params
    const { registration } = await fetchRegistration({
      ...keys,
      backendToken: request.auth.credentials.backendToken
    })

    return redirectPreservingMethod(
      request,
      h,
      summaryLogUploadPathUnder(
        defaultMaterialsHomepagePath(keys, registration)
      )
    )
  }
}

export { summaryLogUploadController, summaryLogUploadRedirectController }

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { RegistrationKeys, RegistrationYearKeys } from '#server/reports/helpers/report-paths.js'
 */
