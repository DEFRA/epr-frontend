/**
 * @import { AccreditationStatus } from '#domain/organisations/model.js'
 */

/**
 * The backend requires both bounds only while the record is live, so a range is
 * always present and says nothing about whether it is filled in.
 * @typedef {{ validFrom: string | null, validTo: string | null }} DateRange
 */

/**
 * One accreditation of a registration, as
 * `/v1/organisations/{id}/registrations/{id}/accreditations` answers. An
 * application that never became an accreditation is in the collection too, so
 * the number is nullable.
 * @typedef {{
 *   id: string,
 *   accreditationNumber: string | null,
 *   status: AccreditationStatus,
 *   reprocessingType: string | null,
 *   dateRange: DateRange,
 *   application: {
 *     orgName: string,
 *     submittedToRegulator: string,
 *     material: string,
 *     wasteProcessingType: string
 *   }
 * }} AccreditationResource
 */

/**
 * @typedef {(key: string, options?: Record<string, string>) => string} Localise
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
