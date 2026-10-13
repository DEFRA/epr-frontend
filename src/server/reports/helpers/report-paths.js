import { CADENCE } from '../constants.js'

/** @import { CadenceValue } from '../constants.js' */

/**
 * @typedef {{ organisationNumber: string, registrationNumber: string }} RegistrationKeys
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
      ? `${registrationPath(keys)}/accreditations/${year}/reports`
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
