/**
 * @import {
 *   AccreditationStatus,
 *   Material,
 *   RegAccStatus,
 *   RegistrationStatus,
 *   RegulatorValue,
 *   ReprocessingType
 * } from '#domain/organisations/model.js'
 * @import { AccreditationNumber } from '#server/common/helpers/accreditation-number.js'
 * @import { OrganisationNumber } from '#server/common/helpers/organisation-number.js'
 * @import { RegistrationNumber } from '#server/common/helpers/registration-number.js'
 */

/**
 * Status changes oldest first, each with the ISO datetime it took effect.
 * @typedef {ReadonlyArray<{ status: string, at: string }>} StatusTimeline
 */

/**
 * @template {string} S
 * @typedef {{ current: S, timeline: StatusTimeline }} Status
 */

/**
 * A year as a JSON object key, such as `'2026'`.
 * @typedef {`${number}`} YearKey
 */

/**
 * A `YYYY-MM-DD` date as a JSON object key, such as `'2026-01-01'`.
 * @typedef {`${number}-${number}-${number}`} DateKey
 */

/**
 * By year, the date each status starts. A status holds until the next date, or
 * the end of the year.
 * @typedef {Record<YearKey, Record<DateKey, { status: RegAccStatus }>>} RegAccStatusByDate
 */

/**
 * `prns.open` is whether PRNs and PERNs can still be raised and issued for the
 * accreditation's year, as the backend rules it.
 * @typedef {{
 *   accreditationNumber: AccreditationNumber,
 *   prns: { open: boolean },
 *   status: Status<AccreditationStatus>
 * }} Accreditation
 */

/**
 * @typedef {{
 *   name: string,
 *   address: {
 *     country: string,
 *     line1: string,
 *     line2?: string,
 *     townOrCity: string,
 *     stateOrRegion?: string,
 *     postcode?: string
 *   },
 *   coordinates?: string
 * }} OverseasSiteView
 */

/**
 * @typedef {Record<string, OverseasSiteView>} OverseasSitesByOrsId
 */

/**
 * @typedef {{
 *   status: Status<RegistrationStatus>,
 *   regAccStatusByDate: RegAccStatusByDate,
 *   validFrom: string,
 *   material: Material,
 *   submittedToRegulator: { code: RegulatorValue },
 *   accreditations: Record<string, Accreditation>,
 *   overseasSites?: OverseasSitesByOrsId
 * }} RegistrationViewCommon
 */

/**
 * @typedef {RegistrationViewCommon & {
 *   wasteProcessingType: 'reprocessor',
 *   reprocessingType: ReprocessingType,
 *   site: {
 *     address: { line1: string, line2?: string, town: string, county?: string, postcode: string } | { fullAddress: string }
 *   }
 * }} ReprocessorRegistrationView
 */

/**
 * @typedef {RegistrationViewCommon & { wasteProcessingType: 'exporter' }} ExporterRegistrationView
 */

/**
 * @typedef {ReprocessorRegistrationView | ExporterRegistrationView} RegistrationView
 */

/**
 * The organisation as `GET /organisations/{organisationNumber}` serves it.
 * Registrations are keyed by registration number, accreditations by year.
 * @typedef {{
 *   organisationNumber: OrganisationNumber,
 *   name: string,
 *   displayName: string,
 *   registrations: Record<string, RegistrationView>,
 *   status: { current: string },
 *   submittedToRegulator: { code: string }
 * }} OrganisationView
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
