import { createServer } from 'node:http'

/**
 * Minimal OIDC discovery stub for running the received-loads form prototype
 * standalone.
 *
 * The frontend fetches the Defra ID `.well-known/openid-configuration` once at
 * startup as a canary. The prototype journey is unauthenticated, so it never
 * exercises the login flow — this stub only needs to satisfy that single
 * startup request so the server boots without the real Defra ID stub.
 */

const PORT = Number(process.env.OIDC_STUB_PORT ?? 3290)
const BASE = `http://localhost:${PORT}`

const configuration = {
  issuer: BASE,
  authorization_endpoint: `${BASE}/authorize`,
  token_endpoint: `${BASE}/token`,
  userinfo_endpoint: `${BASE}/userinfo`,
  end_session_endpoint: `${BASE}/logout`,
  jwks_uri: `${BASE}/.well-known/jwks.json`,
  response_types_supported: ['code'],
  subject_types_supported: ['public'],
  id_token_signing_alg_values_supported: ['RS256'],
  scopes_supported: ['openid', 'offline_access']
}

createServer((request, response) => {
  if (request.url?.startsWith('/.well-known/openid-configuration')) {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify(configuration))
    return
  }
  if (request.url?.startsWith('/.well-known/jwks.json')) {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ keys: [] }))
    return
  }
  response.writeHead(404)
  response.end()
}).listen(PORT, () => {
  process.stdout.write(`OIDC discovery stub listening on ${BASE}\n`)
})
