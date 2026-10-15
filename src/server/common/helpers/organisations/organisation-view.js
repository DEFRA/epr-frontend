/**
 * @import {
 *   AccreditationStatus,
 *   Material,
 *   RegistrationStatus,
 *   RegulatorValue
 * } from '#domain/organisations/model.js'
 */

/**
 * Statuses keyed by the ISO datetime each took effect.
 * @typedef {Record<string, { status: string }>} StatusTimeline
 */

/**
 * @typedef {{
 *   accreditationNumber: string,
 *   status: AccreditationStatus,
 *   statusTimeline: StatusTimeline
 * }} AccreditationView
 */

/**
 * @typedef {{
 *   status: RegistrationStatus,
 *   validFrom: string,
 *   material: Material,
 *   submittedToRegulator: { code: RegulatorValue },
 *   accreditations: Record<string, AccreditationView>
 * }} RegistrationViewCommon
 */

/**
 * @typedef {RegistrationViewCommon & {
 *   wasteProcessingType: 'reprocessor',
 *   site: { address: { line1: string } | { fullAddress: string } }
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
 *   tradingName?: string,
 *   registrations: Record<string, RegistrationView>
 * }} OrganisationView
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
