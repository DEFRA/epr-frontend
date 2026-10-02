/** @import { DateRange } from '#server/common/helpers/organisations/registration-resource.js'; */
/**
 * @import { AccreditationStatus } from '#domain/organisations/model.js'
 */

/**
 * Re-exported so a page's helpers keep one import for the types they read. It
 * is defined beside `RegistrationResource`, which is the shallower module and
 * the one a common helper can reach.
 * @typedef {DateRange} DateRange
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
