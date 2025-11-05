import { config } from '#config/config.js'
import Blankie from 'blankie'

const oidcHost = (oidcConfigurationUrl) => {
  if (oidcConfigurationUrl) {
    const { host } = new URL(oidcConfigurationUrl)
    return [host]
  }
  return []
}

export function cspFormAction({ isProduction, oidcConfigurationUrl }) {
  const oidc = oidcHost(oidcConfigurationUrl)
  return isProduction ? ['self', ...oidc] : ['self', ...oidc, 'localhost:*']
}

/**
 * Manage content security policies.
 * @satisfies {import('@hapi/hapi').Plugin}
 */
const contentSecurityPolicy = {
  plugin: Blankie,
  options: {
    connectSrc: ['self', 'wss', 'data:'],
    defaultSrc: ['self'],
    fontSrc: ['self', 'data:'],
    formAction: cspFormAction({
      isProduction: config.get('isProduction'),
      oidcConfigurationUrl: config.get('defraId.oidcConfigurationUrl')
    }),
    frameAncestors: ['none'],
    frameSrc: ['self', 'data:'],
    generateNonces: false,
    imgSrc: ['self', 'data:'],
    manifestSrc: ['self'],
    mediaSrc: ['self'],
    objectSrc: ['none'],
    // Hash 'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw=' is to support a GOV.UK frontend script bundled within Nunjucks macros
    // https://frontend.design-system.service.gov.uk/import-javascript/#if-our-inline-javascript-snippet-is-blocked-by-a-content-security-policy
    scriptSrc: [
      'self',
      "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='"
    ],
    styleSrc: ['self']
  }
}

export { contentSecurityPolicy }
