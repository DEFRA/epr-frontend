/**
 * @import {
 *   AccreditationStatus,
 *   Material,
 *   RegistrationStatus,
 *   RegulatorValue,
 *   ReprocessingType
 * } from '#domain/organisations/model.js'
 */

/**
 * Statuses keyed by the ISO datetime each took effect.
 * @typedef {Record<string, { status: string }>} StatusTimeline
 */

/**
 * @template {string} S
 * @typedef {{ current: S, timeline: StatusTimeline }} Status
 */

/**
 * @typedef {{
 *   accreditationNumber: string,
 *   status: Status<AccreditationStatus>
 * }} AccreditationView
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
 *   accreditations: Record<string, AccreditationView>,
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
 *   organisationNumber: number,
 *   name: string,
 *   displayName: string,
 *   registrations: Record<string, RegistrationView>
 * }} OrganisationView
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
