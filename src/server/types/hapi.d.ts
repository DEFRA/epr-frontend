// eslint-disable-next-line n/no-missing-import
import type { UserSession } from '../auth/types/session.js'

declare module '@hapi/hapi' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AuthCredentials extends UserSession {}
}
