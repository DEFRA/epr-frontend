import convict from 'convict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getLogFormatType } from './utils/log.js'
import { getSessionCacheEngineType } from './utils/session.js'

/**
 * @import { Schema, SchemaObj } from 'convict'
 * @import { RedisConfig } from '#server/common/helpers/redis-client.js'
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))

const fourHoursMs = 14400000
const oneWeekMs = 604800000

/**
 * The highest valid day-of-month to accept, for the current year.
 * @param {number} month 1-12
 * @returns {number}
 */
function maxDayOfMonth(month) {
  const currentYear = new Date().getFullYear()
  return new Date(currentYear, month, 0).getDate()
}

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'
const isDevelopment = process.env.NODE_ENV === 'development'

export const config = convict({
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  cdpEnvironment: {
    doc: 'The CDP environment the app is running in',
    format: [
      'local',
      'infra-dev',
      'management',
      'dev',
      'test',
      'perf-test',
      'ext-test',
      'prod'
    ],
    default: 'local',
    env: 'ENVIRONMENT'
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 3000,
    env: 'PORT'
  },
  staticCacheTimeout: {
    doc: 'Static cache timeout in milliseconds',
    format: Number,
    default: oneWeekMs,
    env: 'STATIC_CACHE_TIMEOUT'
  },
  serviceName: {
    doc: 'Applications Service Name',
    format: String,
    default: 'epr-frontend'
  },
  root: {
    doc: 'Project root',
    format: String,
    default: path.resolve(dirname, '../..')
  },
  assetPath: {
    doc: 'Asset path',
    format: String,
    default: '/public',
    env: 'ASSET_PATH'
  },
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: isProduction
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: isDevelopment
  },
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: isTest
  },
  log: {
    enabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: process.env.NODE_ENV !== 'test',
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in.',
      format: ['ecs', 'pino-pretty'],
      default: getLogFormatType({ isProduction }),
      env: 'LOG_FORMAT'
    },
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? [
            'http.request.headers.authorization',
            'http.request.headers.cookie',
            'http.response.headers'
          ]
        : []
    }
  },
  httpProxy: /** @type {SchemaObj<string | null>} */ ({
    doc: 'HTTP Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  }),
  isSecureContextEnabled: {
    doc: 'Enable Secure Context',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_SECURE_CONTEXT'
  },
  isMetricsEnabled: {
    doc: 'Enable metrics reporting',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_METRICS'
  },
  session: {
    cache: {
      engine: {
        doc: 'backend cache is written to',
        format: ['redis', 'memory'],
        default: getSessionCacheEngineType({ isProduction }),
        env: 'SESSION_CACHE_ENGINE'
      },
      name: {
        doc: 'server side session cache name',
        format: String,
        default: 'session',
        env: 'SESSION_CACHE_NAME'
      },
      ttl: {
        doc: 'server side session cache ttl',
        format: Number,
        default: fourHoursMs,
        env: 'SESSION_CACHE_TTL'
      }
    },
    cookie: {
      ttl: {
        doc: 'Session cookie ttl',
        format: Number,
        default: fourHoursMs,
        env: 'SESSION_COOKIE_TTL'
      },
      password: {
        doc: 'session cookie password',
        format: String,
        default: 'the-password-must-be-at-least-32-characters-long',
        env: 'SESSION_COOKIE_PASSWORD',
        sensitive: true
      },
      secure: {
        doc: 'set secure flag on cookie',
        format: Boolean,
        default: isProduction,
        env: 'SESSION_COOKIE_SECURE'
      }
    }
  },
  redis: /** @type {Schema<RedisConfig>} */ ({
    host: {
      doc: 'Redis cache host',
      format: String,
      default: '127.0.0.1',
      env: 'REDIS_HOST'
    },
    username: {
      doc: 'Redis cache username',
      format: String,
      default: '',
      env: 'REDIS_USERNAME'
    },
    password: {
      doc: 'Redis cache password',
      format: '*',
      default: '',
      sensitive: true,
      env: 'REDIS_PASSWORD'
    },
    keyPrefix: {
      doc: 'Redis cache key prefix name used to isolate the cached results across multiple clients',
      format: String,
      default: 'epr-frontend:',
      env: 'REDIS_KEY_PREFIX'
    },
    useSingleInstanceCache: {
      doc: 'Connect to a single instance of redis instead of a cluster.',
      format: Boolean,
      default: !isProduction,
      env: 'USE_SINGLE_INSTANCE_CACHE'
    },
    useTLS: {
      doc: 'Connect to redis using TLS',
      format: Boolean,
      default: isProduction,
      env: 'REDIS_TLS'
    }
  }),
  nunjucks: {
    watch: {
      doc: 'Reload templates when they are changed.',
      format: Boolean,
      default: isDevelopment
    },
    noCache: {
      doc: 'Use a cache and recompile templates each time',
      format: Boolean,
      default: isDevelopment
    }
  },
  tracing: {
    header: {
      doc: 'Which header to track',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
  },
  appBaseUrl: {
    doc: 'Application base URL for authentication callbacks',
    format: String,
    default: 'http://localhost:3000',
    env: 'APP_BASE_URL'
  },
  allowedRedirectOrigins: {
    doc: 'Comma-separated list of additional origins the service answers on, such as a vanity domain. A request arriving on one of these keeps that origin for its authentication redirects, instead of falling back to appBaseUrl.',
    format: Array,
    default: /** @type {string[]} */ ([]),
    env: 'ALLOWED_REDIRECT_ORIGINS'
  },
  eprBackendUrl: {
    doc: 'EPR Backend API base URL',
    format: String,
    default: 'http://localhost:3001',
    env: 'EPR_BACKEND_URL'
  },
  wasteOrganisationsApi: {
    useInMemory: {
      doc: 'Use in-memory adapter instead of real API',
      format: Boolean,
      default: false,
      env: 'WASTE_ORGANISATIONS_API_USE_INMEMORY'
    },
    url: {
      doc: 'Waste Organisations API URL',
      format: String,
      env: 'WASTE_ORGANISATIONS_API_URL',
      default: 'https://{env-path}/waste-organisations/organisations'
    },
    key: {
      doc: 'Waste Organisations API x-api-key header value for local development',
      format: String,
      env: 'WASTE_ORGANISATIONS_API_KEY',
      default: ''
    },
    username: {
      doc: 'Waste Organisations API Auth username',
      format: String,
      env: 'WASTE_ORGANISATIONS_API_USERNAME',
      default: ''
    },
    password: {
      doc: 'Waste Organisations API Auth password',
      format: String,
      env: 'WASTE_ORGANISATIONS_API_PASSWORD',
      default: ''
    }
  },
  defraId: {
    oidcConfigurationUrl: {
      doc: 'DEFRA ID OIDC Configuration URL',
      format: String,
      env: 'DEFRA_ID_OIDC_CONFIGURATION_URL',
      default: ''
    },
    serviceId: {
      doc: 'DEFRA ID Service ID',
      format: String,
      env: 'DEFRA_ID_SERVICE_ID',
      default: ''
    },
    clientId: {
      doc: 'DEFRA ID Client ID',
      format: String,
      env: 'DEFRA_ID_CLIENT_ID',
      default: ''
    },
    clientSecret: {
      doc: 'DEFRA ID Client Secret',
      format: String,
      sensitive: true,
      env: 'DEFRA_ID_CLIENT_SECRET',
      default: ''
    },
    manageAccountUrl: {
      doc: 'DEFRA ID Manage Account URL',
      format: String,
      env: 'DEFRA_ID_MANAGE_ACCOUNT_URL',
      default: ''
    }
  },
  entraId: {
    oidcWellKnownConfigurationUrl: {
      doc: 'Entra ID OIDC .well-known configuration URL',
      format: String,
      env: 'ENTRA_OIDC_WELL_KNOWN_CONFIGURATION_URL',
      default:
        'https://login.microsoftonline.com/6f504113-6b64-43f2-ade9-242e05780007/v2.0/.well-known/openid-configuration'
    },
    clientId: {
      doc: 'Entra ID Client ID',
      format: String,
      env: 'ENTRA_CLIENT_ID',
      default: 'bd06da51-53f6-46d0-a9f0-ac562864c887'
    },
    clientSecret: {
      doc: 'Entra ID Client Secret',
      format: String,
      sensitive: true,
      env: 'ENTRA_CLIENT_SECRET',
      default: 'test'
    }
  },
  audit: {
    isEnabled: {
      doc: 'Is auditing enabled',
      format: Boolean,
      default: isProduction,
      env: 'AUDIT_ENABLED'
    }
  },
  analytics: {
    isEnabled: {
      doc: 'Is analytics enabled',
      format: Boolean,
      default: false,
      env: 'ANALYTICS_ENABLED'
    },
    measurementId: {
      doc: 'Measurement id of the analytics property to report to',
      format: String,
      default: '',
      env: 'ANALYTICS_MEASUREMENT_ID'
    }
  },
  satisfactionSurvey: {
    isEnabled: {
      doc: 'Feature Flag: Show the satisfaction survey link on completion pages',
      format: Boolean,
      default: false,
      env: 'FEATURE_FLAG_SATISFACTION_SURVEYS'
    },
    prnUrl: {
      doc: 'Satisfaction survey for the issue a PRN or PERN journey',
      format: String,
      default: '',
      env: 'SATISFACTION_SURVEY_PRN_URL'
    },
    reportUrl: {
      doc: 'Satisfaction survey for the submit your report journey',
      format: String,
      default: '',
      env: 'SATISFACTION_SURVEY_REPORT_URL'
    },
    summaryLogUrl: {
      doc: 'Satisfaction survey for the update your summary log journey',
      format: String,
      default: '',
      env: 'SATISFACTION_SURVEY_SUMMARY_LOG_URL'
    }
  },
  featureFlags: {
    regulatorAccess: {
      doc: 'Feature Flag: Enable Entra ID login for regulators',
      format: Boolean,
      default: false,
      env: 'FEATURE_FLAG_REGULATOR_ACCESS'
    }
  },
  reapplyAccreditation: {
    windowStart: {
      doc: 'Recurring annual start (inclusive) of the reapply-for-accreditation window, as MM-DDTHH:mm in UK local time (Europe/London)',
      format: assertValidReapplyWindowBound,
      default: '09-01T09:05',
      env: 'REAPPLY_ACCREDITATION_WINDOW_START'
    },
    windowEnd: {
      doc: 'Recurring annual end (inclusive) of the reapply-for-accreditation window, as MM-DDTHH:mm in UK local time (Europe/London)',
      format: assertValidReapplyWindowBound,
      default: '12-31T23:59',
      env: 'REAPPLY_ACCREDITATION_WINDOW_END'
    },
    baseUrl: {
      doc: 'WS2 register/enrol frontend base URL the reapply link points at',
      format: assertValidReapplyBaseUrl,
      default: '',
      env: 'REAPPLY_ACCREDITATION_BASE_URL'
    }
  }
})

config.validate({ allowed: 'strict' })

/**
 * Fail fast on a misconfigured reapply window. The feature has no flag and is
 * gated entirely on this config, so a silent bad value is a silent kill switch.
 * Both bounds are validated for shape by `assertValidReapplyWindowBound`
 * (invalid dates such as 02-30 are already unrepresentable by the time this
 * runs); this guard covers the one thing a single bound cannot check on its
 * own - the start being after the end. Because both are zero-padded
 * `MM-DDTHH:mm`, a plain string comparison orders them correctly and stays
 * year-independent, so the annual recurrence still holds.
 * @param {{ windowStart: string; windowEnd: string }} window
 */
export const assertValidReapplyWindow = ({ windowStart, windowEnd }) => {
  if (windowStart > windowEnd) {
    throw new Error(
      `reapplyAccreditation.windowStart (${windowStart}) must not be after windowEnd (${windowEnd})`
    )
  }
}

/**
 * Convict format for `reapplyAccreditation.windowStart` / `windowEnd`. Must be
 * `MM-DDTHH:mm` (year omitted - the window recurs annually) naming a real UK
 * wall-clock date and time, so an invalid date stays unrepresentable rather
 * than silently rolling over at resolution time. Declared as a function so it
 * is hoisted for the schema above.
 * @param {string} value
 */
export function assertValidReapplyWindowBound(value) {
  const match = /^(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)$/.exec(value)

  if (!match) {
    throw new Error(
      `reapplyAccreditation window bound must be MM-DDTHH:mm (24-hour), got "${value}"`
    )
  }

  const month = Number(match[1])
  const day = Number(match[2])

  if (month < 1 || month > 12 || day < 1 || day > maxDayOfMonth(month)) {
    throw new Error(
      `reapplyAccreditation window bound must name a real UK date, got "${value}"`
    )
  }
}

/**
 * Convict format for `reapplyAccreditation.baseUrl`. Empty means the feature is
 * off (no WS2 host wired up yet); any other value must be a valid http(s) URL so
 * a malformed host fails at startup rather than rendering a broken link at
 * request time. Declared as a function so it is hoisted for the schema above.
 * @param {string} value
 */
export function assertValidReapplyBaseUrl(value) {
  if (value === '') {
    return
  }

  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(
      `reapplyAccreditation.baseUrl must be empty or a valid URL, got "${value}"`
    )
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(
      `reapplyAccreditation.baseUrl must be an http(s) URL, got "${value}"`
    )
  }
}

assertValidReapplyWindow(config.get('reapplyAccreditation'))

export const isProductionEnvironment = () =>
  config.get('cdpEnvironment') === 'prod'

export const isLocalEnvironment = () => config.get('cdpEnvironment') === 'local'
