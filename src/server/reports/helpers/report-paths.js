import { CADENCE } from '../constants.js'

/**
 * @import { OrganisationNumber } from '#server/common/helpers/organisation-number.js'
 * @import { RegistrationNumber } from '#server/common/helpers/registration-number.js'
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { CadenceValue } from '../constants.js'
 */

/**
 * @typedef {{ organisationNumber: OrganisationNumber, registrationNumber: RegistrationNumber }} RegistrationKeys
 * @typedef {RegistrationKeys & { year: Year }} RegistrationYearKeys
 * @typedef {RegistrationYearKeys} AccreditationKeys
 * @typedef {RegistrationYearKeys & { cadence: CadenceValue, period: number, submissionNumber: number }} SubmissionKeys
 */

/**
 * The organisation's natural-key address.
 * @param {{ organisationNumber: OrganisationNumber }} keys
 * @returns {string}
 */
export const organisationPath = ({ organisationNumber }) =>
  `/organisations/${encodeURIComponent(organisationNumber)}`

/**
 * The registration's natural-key address.
 * @param {RegistrationKeys} keys
 * @returns {string}
 */
export const registrationPath = ({ registrationNumber, ...keys }) =>
  `${organisationPath(keys)}/registrations/${encodeURIComponent(registrationNumber)}`

/**
 * The accreditation's natural-key address.
 * @param {AccreditationKeys} keys
 * @returns {string}
 */
export const accreditationPath = ({ year, ...keys }) =>
  `${registrationPath(keys)}/accreditations/${year}`

/**
 * @param {RegistrationYearKeys} keys
 * @returns {string}
 */
export const registeredOnlyPath = ({ year, ...keys }) =>
  `${registrationPath(keys)}/${year}`

/**
 * The summary log upload page under a materials homepage.
 * @param {string} homepagePath
 * @returns {string}
 */
export const summaryLogUploadPathUnder = (homepagePath) =>
  `${homepagePath}/summary-logs/upload`

/**
 * The report list page for a registration's year.
 * @param {RegistrationYearKeys} keys
 * @returns {string}
 */
export const reportsListPath = ({ year, ...keys }) =>
  `${registrationPath(keys)}/reports/${year}`

/**
 * @typedef {(keys: RegistrationYearKeys) => string} YearPath
 * @type {Record<CadenceValue, { homepage: YearPath, reports: YearPath }>}
 */
const ledgerPaths = {
  [CADENCE.MONTHLY]: {
    homepage: accreditationPath,
    reports: (keys) => `${accreditationPath(keys)}/reports`
  },
  [CADENCE.QUARTERLY]: {
    homepage: registeredOnlyPath,
    reports: reportsListPath
  }
}

/**
 * The summary log upload page for a report's year and ledger. Chosen by
 * cadence, not accreditation status: a registration accredited mid-year still
 * has quarterly registered-only reports for its earlier months.
 * @param {RegistrationYearKeys & { cadence: CadenceValue }} keys
 * @returns {string}
 */
export const summaryLogUploadPath = ({ cadence, ...keys }) =>
  summaryLogUploadPathUnder(ledgerPaths[cadence].homepage(keys))

/**
 * One submission's page address; a page appends its own suffix.
 * @param {SubmissionKeys} keys
 * @returns {string}
 */
export const reportPath = ({ cadence, period, submissionNumber, ...keys }) =>
  `${ledgerPaths[cadence].reports(keys)}/${cadence}/${period}/submissions/${submissionNumber}`

/**
 * The backend natural-key route for one submission.
 * @param {SubmissionKeys} keys
 * @returns {string}
 */
export const reportApiPath = (keys) => reportPath(keys)

/**
 * The backend reporting calendar route for a registration's year.
 * @param {RegistrationYearKeys} keys
 * @returns {string}
 */
export const reportsCalendarApiPath = (keys) =>
  `${reportsListPath(keys)}/calendar`
