import { fileURLToPath } from 'node:url'
import path from 'path'
import nunjucks from 'nunjucks'
import { load } from 'cheerio'
import { JSDOM } from 'jsdom'
import { camelCase } from 'lodash-es'
import * as filters from '#config/nunjucks/filters/index.js'
import * as globals from '#config/nunjucks/globals.js'

/**
 * @import { DOMWindow } from 'jsdom'
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const nunjucksTestEnv = nunjucks.configure(
  [
    'node_modules/govuk-frontend/dist/',
    path.normalize(path.resolve(dirname, '../templates')),
    path.normalize(path.resolve(dirname, '../components'))
  ],
  {
    trimBlocks: true,
    lstripBlocks: true
  }
)

Object.entries(globals).forEach(([name, global]) => {
  nunjucksTestEnv.addGlobal(name, global)
})

Object.entries(filters).forEach(([name, filter]) => {
  nunjucksTestEnv.addFilter(name, filter)
})

/**
 * @param {string} componentName
 * @param {Record<string, unknown>} params
 * @param {string} [callBlock]
 * @returns {string}
 */
const renderComponentHtml = (componentName, params, callBlock) => {
  const macroPath = `${componentName}/macro.njk`
  const macroName = `app${
    componentName.charAt(0).toUpperCase() + camelCase(componentName.slice(1))
  }`
  const macroParams = JSON.stringify(params, null, 2)
  let macroString = `{%- from "${macroPath}" import ${macroName} -%}`

  if (callBlock) {
    macroString += `{%- call ${macroName}(${macroParams}) -%}${callBlock}{%- endcall -%}`
  } else {
    macroString += `{{- ${macroName}(${macroParams}) -}}`
  }

  return nunjucksTestEnv.renderString(macroString, {})
}

/**
 * @param {string} componentName
 * @param {Record<string, unknown>} params
 * @param {string} [callBlock]
 */
export const renderComponent = (componentName, params, callBlock) =>
  load(renderComponentHtml(componentName, params, callBlock))

/**
 * The component rendered into a DOM, for tests that query it the way a user
 * meets it -- by role and accessible name -- rather than by selector.
 * @param {string} componentName
 * @param {Record<string, unknown>} params
 * @param {string} [callBlock]
 * @returns {InstanceType<DOMWindow['HTMLElement']>}
 */
export const renderComponentDom = (componentName, params, callBlock) =>
  new JSDOM(renderComponentHtml(componentName, params, callBlock), {
    url: 'http://localhost'
  }).window.document.body
