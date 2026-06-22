# Received-loads forms prototype

A GOV.UK multi-step journey for entering a *received load for reprocessing*
through a series of forms, as an alternative to the spreadsheet upload.

The journey runs **without authentication and without a backend**: answers are
held in the session and the final step records nothing — it just confirms
completion. That makes it cheap to spin up standalone for a demo.

## Run it standalone

Two processes are needed: a tiny OIDC discovery stub, and the frontend dev
server pointed at it.

The frontend registers the Defra ID `bell` auth strategy at startup even though
this journey never logs in. Two things must be satisfied for the server to boot:

1. A reachable Defra ID `.well-known/openid-configuration` — the frontend
   fetches it once at startup as a canary. `dev-oidc-stub.mjs` answers exactly
   that one request.
2. Non-empty `clientId` / `clientSecret` / `serviceId` — `bell` Joi-validates
   these and the whole server crashes on an empty `clientId`. Any non-empty
   dummy values work.

Session cache defaults to in-memory outside production, so no Redis is needed.

### 1. Start the OIDC discovery stub

From the repo root:

```bash
node src/server/received-loads/dev-oidc-stub.mjs
```

Listens on `http://localhost:3290` (override with `OIDC_STUB_PORT`). Leave it
running in its own terminal.

### 2. Start the frontend dev server

In a second terminal, from the repo root:

```bash
DEFRA_ID_OIDC_CONFIGURATION_URL=http://localhost:3290/.well-known/openid-configuration \
DEFRA_ID_CLIENT_ID=prototype-client \
DEFRA_ID_CLIENT_SECRET=prototype-secret \
DEFRA_ID_SERVICE_ID=prototype-service \
npm run dev
```

`npm run dev` runs webpack and the server in watch mode, so edits reload
automatically. Wait for `Server started successfully` in the logs.

### 3. Open the journey

```
http://localhost:3000/received-loads
```

That base path redirects to `/received-loads/start`.

## The journey

`/received-loads` → `start` → `how` (waste-tracking lookup or manual entry) →
the per-step forms (`date-received`, `waste-type`, `prn`, `weights`,
`recyclability`, `supplier-details`, `carrier-details`) →
`check-your-answers` → `confirmation`.

Choosing the waste-tracking route uses `waste-tracking-id` →
`waste-tracking-details` to pre-fill from a looked-up movement; see
`waste-tracking.js` for the example IDs that resolve.

## Troubleshooting

- **Server exits at boot with a Joi `ValidationError` on `clientId`** — the
  dummy Defra ID env vars above are missing.
- **Startup hangs or errors fetching `.well-known/openid-configuration`** — the
  OIDC stub isn't running, or `DEFRA_ID_OIDC_CONFIGURATION_URL` doesn't point at
  it.
- **Port 3000 already in use** — another frontend instance is running; stop it
  or set `PORT`.
