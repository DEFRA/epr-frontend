/**
 * @import {Request, ResponseToolkit, Server} from '@hapi/hapi'
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
 * Omitting the base `logger` lets our TypedLogger fully replace hapi-pino's
 * augmented `pino.Logger` instead of intersecting with it — calls like
 * `server.logger.warn({ ...non-allowlisted fields })` then fail tsc.
 * @typedef {Omit<Server, 'app' | 'logger'> & {
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
 *   - `logger` replaces hapi-pino's augmented `pino.Logger` with our
 *     TypedLogger; calls like `request.logger.warn({ ...non-allowlisted
 *     fields })` then fail tsc.
 * @typedef {Omit<Request, 'auth' | 'logger' | 'server' | 'state' | 'yar'> & {
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

/**
 * Mirror of the bits of `@hapi/hapi`'s `ServerRoute` we use, parameterised
 * over the request type so handlers and `pre` methods type-check against
 * our typed request rather than hapi's plain `Request<ReqRefDefaults>`.
 *
 * `handler` and `pre[].method` are declared in method-shorthand style so
 * their parameter types stay bivariant under `strictFunctionTypes` —
 * controllers may narrow `request` (e.g. `HapiRequest & { params: ... }`)
 * without breaking the satisfies check.
 * @template {HapiRequest} TReq
 * @typedef {{
 *   method?: string | string[],
 *   path?: string,
 *   options?: object,
 *   handler?(request: TReq, h: ResponseToolkit): unknown,
 *   pre?: { method(request: TReq): unknown, assign: string }[]
 * }} HapiServerRoute
 */

/**
 * Mirror of `@hapi/hapi`'s plugin shape, parameterised over the options
 * payload. `register` receives `HapiServer` so `server.logger.X({ ... })`
 * calls inside `register` get the TypedLogger surface.
 * @template [TOptions=void]
 * @typedef {object} HapiPlugin
 * @property {string} name
 * @property {string} [version]
 * @property {(server: HapiServer, options: TOptions) => Promise<void> | void} register
 */

/**
 * @template [TOptions=void]
 * @typedef {{
 *   plugin: HapiPlugin<TOptions>,
 *   options?: TOptions
 * }} HapiServerRegisterPluginObject
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
