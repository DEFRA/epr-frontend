/**
 * Session data for a PRN draft, written by postController and
 * read by discardController, viewController and createdController.
 * @typedef {{
 *   id: string,
 *   tonnage: number,
 *   tonnageInWords: string,
 *   material: string,
 *   status: string,
 *   recipientName: string,
 *   notes: string,
 *   wasteProcessingType: string,
 *   processToBeUsed: string,
 *   isDecemberWaste: boolean
 * }} PrnDraftSession
 */

/**
 * Session data written after a draft PRN is confirmed
 * (status transitions to awaiting_authorisation). Read by
 * createdController to render the success page.
 * @typedef {{
 *   id: string,
 *   prnNumber: string | null,
 *   tonnage: number,
 *   material: string,
 *   status: string,
 *   wasteProcessingType: string
 * }} PrnCreatedSession
 */

/**
 * Session data written by issueController to bridge MongoDB replication
 * lag when issuedController reads the freshly-issued PRN.
 * @typedef {{
 *   id: string,
 *   prnNumber: string | null
 * }} PrnIssuedSession
 */

/**
 * Route params for the PRN list and create endpoints.
 * @typedef {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string
 * }} PrnListParams
 */

/**
 * Route params for PRN detail endpoints (view, delete, discard, cancel, etc.).
 * @typedef {PrnListParams & { prnId: string }} PrnDetailParams
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
