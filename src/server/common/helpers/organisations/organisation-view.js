/**
 * @import {
 *   AccreditationStatus,
 *   Material,
 *   RegistrationStatus,
 *   RegulatorValue
 * } from '#domain/organisations/model.js'
 */

/**
 * @typedef {{ accreditationNumber: string, status: AccreditationStatus }} AccreditationView
 */

/**
 * @typedef {{
 *   status: RegistrationStatus,
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
