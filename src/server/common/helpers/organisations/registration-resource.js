/**
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
 * The accreditation a registration holds, as the registration names it. The
 * accreditation's own content is its sub-resource's to serve.
 * @typedef {{
 *   id: string,
 *   accreditationNumber: string | null,
 *   status: string
 * }} AccreditationLink
 */

/**
 * One registration, as `/v1/organisations/{id}/registrations` and
 * `/v1/organisations/{id}/registrations/{id}` both answer.
 *
 * The keys outside `application` are the ones a regulator decides. The keys
 * inside it are the answers the applicant gave on the form, so `orgName` is
 * the name they typed and not the organisation's own name.
 *
 * The material appears in both places and means a different thing in each: the
 * top-level one is what the registration resolved to, and it is absent until it
 * resolves to exactly one.
 * @typedef {{
 *   id: string,
 *   organisation: { id: string },
 *   registrationNumber: string | null,
 *   status: string,
 *   material?: string,
 *   reprocessingType: string | null,
 *   accreditations: AccreditationLink[],
 *   application: {
 *     orgName: string,
 *     submittedToRegulator: string,
 *     material: string,
 *     wasteProcessingType: string,
 *     site: { address: SiteAddress } | null
 *   }
 * }} RegistrationResource
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
