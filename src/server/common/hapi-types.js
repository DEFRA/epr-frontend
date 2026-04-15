/**
 * @import {Request} from '@hapi/hapi'
 * @import {TFunction, i18n} from 'i18next'
 * @import {Metrics} from '@defra/cdp-metrics'
 * @import {WasteOrganisationsService} from './helpers/waste-organisations/port.js'
 * @import {UserSession} from '../auth/types/session.js'
 */

/**
 * @typedef {{
 *   set: (session: object) => void,
 *   clear: () => void,
 *   ttl: (msecs: number) => void
 * }} CookieAuth
 */

/**
 * Authenticated request auth data. `credentials` holds the UserSession
 * populated by `@hapi/cookie` on behalf of our Defra ID bell strategy.
 *
 * Note: Hapi's own `RequestAuth.credentials` is non-nullable regardless of
 * route auth mode. Routes that register with `auth: { mode: 'try' }` or
 * `auth: false` should still keep their runtime `if (!credentials)` guards;
 * this type follows Hapi's convention rather than modelling the 'try'-mode
 * nuance in the type system.
 * @typedef {Omit<Request['auth'], 'credentials'> & {
 *   credentials: UserSession
 * }} RequestAuth
 */

/**
 * Hapi request extended with the decorations contributed by the app's
 * registered plugins:
 *   - `t`, `i18n` from i18next-http-middleware
 *   - `localiseUrl` from src/server/common/helpers/i18next.js
 *   - `wasteOrganisationsService` from the waste organisations plugin
 *   - `metrics` from `@defra/cdp-metrics`
 *   - `cookieAuth` from `@hapi/cookie`
 *   - `auth.credentials` narrowed to `UserSession`
 * @typedef {Omit<Request, 'auth'> & {
 *   auth: RequestAuth,
 *   t: TFunction,
 *   i18n: i18n,
 *   localiseUrl: (url: string) => string,
 *   wasteOrganisationsService: WasteOrganisationsService,
 *   metrics: () => Metrics,
 *   cookieAuth: CookieAuth
 * }} HapiRequest
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
