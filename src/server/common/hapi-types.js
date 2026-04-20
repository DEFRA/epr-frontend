/**
 * @import {Request, Server} from '@hapi/hapi'
 * @import {Yar} from '@hapi/yar'
 * @import {Policy, PolicyOptions} from '@hapi/catbox'
 * @import {TFunction, i18n} from 'i18next'
 * @import {Metrics} from '@defra/cdp-metrics'
 * @import {TypedLogger} from './helpers/logging/logger.js'
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
 * Cookie written by the `@hapi/cookie` session strategy after sign-in.
 * @typedef {{ sessionId: string }} SessionCookieState
 */

/**
 * Cache policy used to persist `UserSession` records keyed by `sessionId`.
 * Provisioned in `src/server/index.js` as `server.app.cache`.
 * @typedef {Policy<UserSession, PolicyOptions<UserSession>>} SessionCache
 */

/**
 * Application state attached to the Hapi server during startup.
 * @typedef {{ cache: SessionCache }} AppState
 */

/**
 * Hapi server with our application state and the CDP-compliant typed logger.
 * Intersecting `logger` with `TypedLogger` advertises the
 * `IndexedLogProperties` shape alongside the broader `pino.Logger` that
 * hapi-pino contributes, so `server.logger.*` call-sites get the CDP
 * Elasticsearch allow-list surfaced in IDE hints. It does not hard-enforce
 * the allow-list — pino's `(obj: object, msg?) => void` overload remains
 * reachable through the intersection. Use `createLogger()` directly where
 * strict narrowing is required.
 * @typedef {Omit<Server, 'app'> & {
 *   app: AppState,
 *   logger: TypedLogger
 * }} HapiServer
 */

/**
 * Yar session with the flash keys used in this app. `@hapi/yar`'s typed
 * single-argument `flash` overload rejects any key not registered through
 * module augmentation; since we don't write TypeScript, we add the keys we
 * use here as extra overloads layered on top of yar's own typings.
 * @typedef {{
 *   (type: 'referrer'): string[]
 * } & Yar['flash']} HapiYarFlash
 */

/**
 * @typedef {Omit<Yar, 'flash'> & { flash: HapiYarFlash }} HapiYar
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
 *   - `server.app.cache` narrowed to the `SessionCache` set up at startup
 *   - `state.userSession` narrowed to the cookie state written by the
 *     session strategy
 *   - `yar.flash` extended with the flash keys the app uses
 *   - `logger` intersected with `TypedLogger` so object-form log calls get
 *     the CDP `IndexedLogProperties` shape advertised in IDE hints without
 *     losing the rest of the pino logger surface hapi-pino contributes.
 *     The intersection does not hard-enforce the allow-list — pino's
 *     `(obj: object, msg?) => void` overload remains reachable. Use
 *     `createLogger()` directly where strict narrowing is required.
 * @typedef {Omit<Request, 'auth' | 'server' | 'state' | 'yar'> & {
 *   auth: RequestAuth,
 *   logger: TypedLogger,
 *   server: HapiServer,
 *   state: Request['state'] & { userSession?: SessionCookieState },
 *   yar: HapiYar,
 *   t: TFunction,
 *   i18n: i18n,
 *   localiseUrl: (url: string) => string,
 *   wasteOrganisationsService: WasteOrganisationsService,
 *   metrics: () => Metrics,
 *   cookieAuth: CookieAuth
 * }} HapiRequest
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
