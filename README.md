# epr-frontend

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_epr-frontend&metric=alert_status&token=4b04dbd4d92dd728767f9547481526fa4481eb30)](https://sonarcloud.io/summary/new_code?id=DEFRA_epr-frontend)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_epr-frontend&metric=coverage&token=4b04dbd4d92dd728767f9547481526fa4481eb30)](https://sonarcloud.io/summary/new_code?id=DEFRA_epr-frontend)

Frontend for: Packaging Extended Producer Responsibilities

- [Requirements](#requirements)
  - [Node.js](#nodejs)
  - [Gitleaks](#gitleaks)
  - [Mise](#mise)
- [Server-side Caching](#server-side-caching)
- [Redis](#redis)
- [Proxy](#proxy)
- [Local Development](#local-development)
  - [Setup](#setup)
  - [Development](#development)
  - [Production](#production)
  - [Npm scripts](#npm-scripts)
  - [Update dependencies](#update-dependencies)
  - [Formatting](#formatting)
    - [Windows prettier issue](#windows-prettier-issue)
- [Docker](#docker)
  - [Development image](#development-image)
  - [Production image](#production-image)
  - [Docker Compose](#docker-compose)
- [Testing](#testing)
  - [Unit tests](#unit-tests)
  - [Journey tests](#journey-tests)
- [Dependabot](#dependabot)
- [SonarCloud](#sonarcloud)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

This project is written in [Node.js](http://nodejs.org/) and uses [npm](https://npmjs.org/) to manage dependencies.

It uses [nvm](https://github.com/nvm-sh/nvm) to install and manage Node via a [.nvmrc](https://github.com/nvm-sh/nvm#nvmrc)
file which is set to reference the latest [Active LTS](https://nodejs.org/en/about/previous-releases) version.

To use the correct version of Node.js for this application, via nvm:

```bash
cd epr-frontend
nvm use
```

### Gitleaks

[Gitleaks](https://github.com/gitleaks/gitleaks) is required for pre-commit secret scanning and must be available on your PATH.

The simplest install on macOS/Linux is via [mise](#mise)

```bash
mise trust && mise install
```

Alternatively, install directly:

- macOS: `brew install gitleaks`
- Linux/Windows: see the [gitleaks releases page](https://github.com/gitleaks/gitleaks/releases)

### Mise

[mise](https://mise.jdx.dev/) - a polyglot version manager that reads `mise.toml` in this repo to install the correct pinned versions

1. [Install](https://mise.jdx.dev/getting-started.html#installing-mise-cli)
2. [Activate](https://mise.jdx.dev/getting-started.html#activate-mise) in your shell

## Server-side Caching

We use Catbox for server-side caching. By default the service will use CatboxRedis when deployed and CatboxMemory for
local development.
You can override the default behaviour by setting the `SESSION_CACHE_ENGINE` environment variable to either `redis` or
`memory`.

Please note: CatboxMemory (`memory`) is _not_ suitable for production use! The cache will not be shared between each
instance of the service and it will not persist between restarts.

## Redis

Redis is an in-memory key-value store. Every instance of a service has access to the same Redis key-value store similar
to how services might have a database (or MongoDB). All frontend services are given access to a namespaced prefixed that
matches the service name. e.g. `my-service` will have access to everything in Redis that is prefixed with `my-service`.

If your service does not require a session cache to be shared between instances or if you don't require Redis, you can
disable setting `SESSION_CACHE_ENGINE=false` or changing the default value in `~/src/config/index.js`.

## Proxy

We are using forward-proxy which is set up by default. To make use of this: `import { fetch } from 'undici'` then because of the `setGlobalDispatcher(new ProxyAgent(proxyUrl))` calls will use the ProxyAgent Dispatcher

If you are not using Wreck, Axios or Undici or a similar http that uses `Request`. Then you may have to provide the proxy dispatcher:

To add the dispatcher to your own client:

```javascript
import { ProxyAgent } from 'undici'

return await fetch(url, {
  dispatcher: new ProxyAgent({
    uri: proxyUrl,
    keepAliveTimeout: 10,
    keepAliveMaxTimeout: 10
  })
})
```

## Local Development

### Setup

Install application dependencies:

```bash
npm install
```

### Development

To run the application in `development` mode run:

```bash
npm run dev
```

### Production

To mimic the application running in `production` mode locally run:

```bash
npm start
```

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json)
To view them in your command line run:

```bash
npm run
```

### Update dependencies

To update dependencies use [npm-check-updates](https://github.com/raineorshine/npm-check-updates):

> The following script is a good start. Check out all the options on
> the [npm-check-updates](https://github.com/raineorshine/npm-check-updates)

```bash
ncu --interactive --format group
```

### Formatting

#### Windows prettier issue

If you are having issues with formatting of line breaks on Windows update your global git config by running:

```bash
git config --global core.autocrlf false
```

## Docker

### Development image

Build:

```bash
docker build --target development --no-cache --tag epr-frontend:development .
```

Run:

```bash
docker run -p 3000:3000 epr-frontend:development
```

### Production image

Build:

```bash
docker build --no-cache --tag epr-frontend .
```

Run:

```bash
docker run -p 3000:3000 epr-frontend
```

### Docker Compose

Use the compose setup in our [service repo](https://github.com/DEFRA/epr-re-ex-service/blob/main/CONTRIBUTING.md#docker-compose)

## Testing

### Unit tests

Run unit tests with:

```bash
npm test
```

### Journey tests

Journey tests live in [DEFRA/epr-frontend-journey-tests](https://github.com/DEFRA/epr-frontend-journey-tests).

To develop journey tests alongside your work, create a branch in that repo matching your frontend branch name.
The CI picks up the matching branch automatically, and uses `main` where no match is found.

Merging journey test branches back to main is a separate manual step.

## Dependabot

Dependabot is configured for managing dependency updates, see: [.github/dependabot.yml](.github/dependabot.yml)

## SonarCloud

SonarCloud is configured via [sonar-project.properties](./sonar-project.properties).

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
