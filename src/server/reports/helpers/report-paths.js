import { CADENCE } from '../constants.js'

/** @import { CadenceValue } from '../constants.js' */

/**
 * @typedef {{ organisationNumber: string, registrationNumber: string }} RegistrationKeys
 * @typedef {RegistrationKeys & { year: string }} AccreditationKeys
 * @typedef {RegistrationKeys & { year: number, cadence: CadenceValue, period: number, submissionNumber: number }} SubmissionKeys
 */

/**
 * The registration's natural-key address.
 * @param {RegistrationKeys} keys
 * @returns {string}
 */
export const registrationPath = ({ organisationNumber, registrationNumber }) =>
  `/organisations/${encodeURIComponent(organisationNumber)}/registrations/${encodeURIComponent(registrationNumber)}`

/**
 * The accreditation's natural-key address.
 * @param {AccreditationKeys} keys
 * @returns {string}
 */
export const accreditationPath = ({ year, ...keys }) =>
  `${registrationPath(keys)}/accreditations/${encodeURIComponent(year)}`

/**
 * The report list page for a registration.
 * @param {RegistrationKeys} keys
 * @returns {string}
 */
export const reportsListPath = (keys) => `${registrationPath(keys)}/reports`

/**
 * One submission's page address; a page appends its own suffix.
 * @param {SubmissionKeys} keys
 * @returns {string}
 */
export const reportPath = ({
  year,
  cadence,
  period,
  submissionNumber,
  ...keys
}) => {
  const reports =
    cadence === CADENCE.MONTHLY
      ? `${accreditationPath({ ...keys, year: String(year) })}/reports`
      : `${reportsListPath(keys)}/${year}`

  return `${reports}/${cadence}/${period}/submissions/${submissionNumber}`
}

/**
 * The backend natural-key route for one submission.
 * @param {SubmissionKeys} keys
 * @returns {string}
 */
export const reportApiPath = (keys) => reportPath(keys)

/**
 * The backend reporting calendar route for a registration.
 * @param {RegistrationKeys} keys
 * @returns {string}
 */
export const reportsCalendarApiPath = (keys) =>
  `${reportsListPath(keys)}/calendar`
