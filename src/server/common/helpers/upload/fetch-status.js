import fetch from 'node-fetch'

import { config } from '#config/config.js'

async function fetchStatus(id) {
  const endpointUrl = config.get('cdpUploader.url') + `/status/${id}`

  const response = await fetch(endpointUrl, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })

  // @todo: handle response errors
  return response.json()
}

export { fetchStatus }
