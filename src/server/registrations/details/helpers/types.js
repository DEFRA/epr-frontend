/**
 * The stretch a registration or an accreditation covers. Each bound stands on
 * its own: the backend requires both only while the record is live, so a range
 * is always present and says nothing about whether it is filled in.
 * @typedef {{ validFrom: string | null, validTo: string | null }} DateRange
 */

/**
 * The address of the site a registration names, as the backend holds it.
 * @typedef {{
 *   line1?: string,
 *   line2?: string,
 *   town?: string,
 *   county?: string,
 *   country?: string,
 *   postcode?: string,
 *   region?: string,
 *   fullAddress?: string
 * }} SiteAddress
 */

/**
 * One registration, as `/v1/organisations/{id}/registrations/{id}` answers.
 *
 * The keys outside `application` are the ones a regulator decides. The keys
 * inside it are the answers the applicant gave on the form, so `orgName` is
 * the name they typed and not the organisation's own name.
 * @typedef {{
 *   id: string,
 *   organisationId: string,
 *   registrationNumber: string | null,
 *   status: string,
 *   reprocessingType: string | null,
 *   application: {
 *     orgName: string,
 *     submittedToRegulator: string,
 *     material: string,
 *     wasteProcessingType: string,
 *     site: { address: SiteAddress } | null
 *   }
 * }} RegistrationResource
 */

/**
 * One accreditation of a registration, as
 * `/v1/organisations/{id}/registrations/{id}/accreditations` answers. An
 * application that never became an accreditation is in the collection too, so
 * the number is nullable.
 * @typedef {{
 *   id: string,
 *   accreditationNumber: string | null,
 *   status: string,
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

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
