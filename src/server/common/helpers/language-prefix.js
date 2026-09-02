import { pathPrefix } from '#server/common/constants/languages.js'

/**
 * @param {string} path
 */
export const isWelshPath = (path) =>
  path === pathPrefix.cy || path.startsWith(`${pathPrefix.cy}/`)

/**
 * The address a path is routed on. Welsh pages are served by their english
 * routes, so the prefix comes off before anything matches a route table.
 * @param {string} path
 */
export const withoutLanguagePrefix = (path) =>
  isWelshPath(path) ? path.slice(pathPrefix.cy.length) || '/' : path
