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
 * @typedef {{
 *   accreditationNumber: string,
 *   status: AccreditationStatus,
 *   statusTimeline: Record<string, { status: string }>
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
 *   tradingName?: string,
 *   registrations: Record<string, RegistrationView>
 * }} OrganisationView
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
