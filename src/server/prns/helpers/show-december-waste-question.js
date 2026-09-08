import { REPROCESSING_TYPE } from '#domain/organisations/model.js'

/**
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { DecemberPrnEligibility } from './fetch-december-prn-eligibility.js'
 */

/**
 * Whether the "Is this December waste?" question should be shown on the
 * create-PRN journey (PAE-1913). True only for a reprocessor on output, when
 * the backend's December Waste window is currently open for the
 * accreditation (see fetch-december-prn-eligibility.js) - that timing check
 * is server-side, so this is only the reprocessing-type gate on top of it.
 *
 * Everyone else - input reprocessors, exporters - never sees the option; that
 * is out of scope here and covered by later December Waste stories.
 * @param {Registration} registration
 * @param {DecemberPrnEligibility} eligibility
 * @returns {boolean}
 */
export const showDecemberWasteQuestion = (registration, { eligible }) =>
  registration.reprocessingType === REPROCESSING_TYPE.OUTPUT && eligible
