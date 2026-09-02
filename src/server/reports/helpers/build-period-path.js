/**
 * @import { CadenceValue } from '../constants.js'
 * @import { ReportingPeriod } from './fetch-reporting-periods.js'
 */

/**
 * The address of one submission for one reporting period. The action a page
 * offers on the period appends its own suffix, so this stops short of one.
 * @param {object} args
 * @param {string} args.organisationId
 * @param {string} args.registrationId
 * @param {ReportingPeriod} args.period the whole period, not its number
 * @param {CadenceValue} args.cadence
 * @returns {string} unlocalised path, no `/view` suffix
 */
export const buildPeriodPath = ({
  organisationId,
  registrationId,
  period,
  cadence
}) =>
  `/organisations/${organisationId}/registrations/${registrationId}/reports/${period.year}/${cadence}/${period.period}/submissions/${period.submissionNumber}`
