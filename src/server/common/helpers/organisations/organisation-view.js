/**
 * @import {
 *   AccreditationStatus,
 *   Material,
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
 * `relevantYearOpen` is whether PRNs and PERNs can still be raised and issued
 * for the accreditation's year, as the backend rules it.
 * @typedef {{
 *   accreditationNumber: AccreditationNumber,
 *   relevantYearOpen?: boolean,
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
 *   registrations: Record<string, RegistrationView>
 * }} OrganisationView
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
