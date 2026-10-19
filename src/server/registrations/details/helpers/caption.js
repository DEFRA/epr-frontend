/**
 * The records a page sits under, dropping any that has no number.
 * @param {(string | null | undefined)[]} parts
 * @returns {string}
 */
export const toCaption = (parts) => parts.filter(Boolean).join(' - ')
