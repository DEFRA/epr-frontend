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
 * The period an accreditation is valid over. The backend requires both bounds
 * only while it is approved or suspended, so the range is always present and
 * says nothing about whether it is filled in.
 * @typedef {{ validFrom: string | null, validTo: string | null }} DateRange
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
