import { ENTRA_ID_BASE_URL, createServerTest } from './server.js'

/**
 * A server built for each test, for tests that change the server's state
 * (its cache, session store or registered extensions).
 */
const it = createServerTest('test')

const beforeEach = it.beforeEach

export { ENTRA_ID_BASE_URL, beforeEach, it, it as test }
