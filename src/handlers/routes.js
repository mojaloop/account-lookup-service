/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * ModusBox
 - Steven Oderayi <steven.oderayi@modusbox.com>
 --------------
 ******/

'use strict'

/**
 * Request handler
 *
 * @param {object} api OpenAPIBackend instance
 * @param {object} req Request
 * @param {object} h   Response handle
 */
const handleRequest = (api, req, h) => api.handleRequest(
  {
    method: req.method,
    path: req.path,
    body: req.payload,
    query: req.query,
    headers: req.headers
  }, req, h)

/**
 * Core API Routes
 *
 * @param {object} api OpenAPIBackend instance
 */
const APIRoutes = (api) => [
  {
    method: 'GET',
    path: '/health',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'health'],
      description: 'GET health'
    }
  },
  {
    method: 'PUT',
    path: '/participants/{ID}/error',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'participants', 'sampled'],
      description: 'PUT Participant error by ID'
    }
  },
  {
    method: 'PUT',
    path: '/participants/{ID}',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'participants', 'sampled'],
      description: 'PUT Participant by ID'
    }
  },
  {
    method: 'PUT',
    path: '/participants/{Type}/{ID}/error',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'participants', 'sampled'],
      description: 'PUT Participant error by Type & ID'
    }
  },
  {
    method: 'PUT',
    path: '/participants/{Type}/{ID}/{SubId}/error',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'participants', 'sampled'],
      description: 'PUT Participant error by Type, ID & SubId'
    }
  },
  {
    method: 'GET',
    path: '/participants/{Type}/{ID}/{SubId}',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'participants', 'sampled'],
      description: 'GET Participants by Type, ID & SubId'
    }
  },
  {
    method: 'PUT',
    path: '/participants/{Type}/{ID}/{SubId}',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'participants', 'sampled'],
      description: 'PUT Participant by Type, ID & SubId'
    }
  },
  {
    method: 'POST',
    path: '/participants/{Type}/{ID}/{SubId}',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'participants', 'sampled'],
      description: 'POST Participant by Type, ID & SubId'
    }
  },
  {
    method: 'DELETE',
    path: '/participants/{Type}/{ID}/{SubId}',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'participants', 'sampled'],
      description: 'DELETE Participant by Type, ID, & SubId'
    }
  },
  {
    method: 'GET',
    path: '/participants/{Type}/{ID}',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'participants', 'sampled'],
      description: 'GET Participant by Type & ID'
    }
  },
  {
    method: 'PUT',
    path: '/participants/{Type}/{ID}',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'participants', 'sampled'],
      description: 'PUT Participant by Type & ID'
    }
  },
  {
    method: 'POST',
    path: '/participants/{Type}/{ID}',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'participants', 'sampled'],
      description: 'POST Participant by Type & ID'
    }
  },
  {
    method: 'DELETE',
    path: '/participants/{Type}/{ID}',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'participants', 'sampled'],
      description: 'DELETE Participant by Type & ID'
    }
  },
  {
    method: 'POST',
    path: '/participants',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'participants', 'sampled'],
      description: 'POST Participants'
    }
  },
  {
    method: 'GET',
    path: '/parties/{Type}/{ID}',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'parties', 'sampled'],
      description: 'GET Parties by Type & ID'
    }
  },
  {
    method: 'PUT',
    path: '/parties/{Type}/{ID}',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'parties', 'sampled'],
      description: 'PUT Parties by Type & ID'
    }
  },
  {
    method: 'PUT',
    path: '/parties/{Type}/{ID}/error',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'parties', 'sampled'],
      description: 'PUT Parties error by Type & ID'
    }
  },
  {
    method: 'GET',
    path: '/parties/{Type}/{ID}/{SubId}',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'parties', 'sampled'],
      description: 'GET Parties by Type, ID & SubId'
    }
  },
  {
    method: 'PUT',
    path: '/parties/{Type}/{ID}/{SubId}',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'parties', 'sampled'],
      description: 'PUT Parties by Type, ID & SubId'
    }
  },
  {
    method: 'PUT',
    path: '/parties/{Type}/{ID}/{SubId}/error',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'parties', 'sampled'],
      description: 'PUT Parties error by Type, ID & SubId'
    }
  },
  {
    method: 'DELETE',
    path: '/endpointcache',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'sampled'],
      description: 'DELETE Participants Endpoint Cache'
    }
  }
]

/**
 * Admin API Routes
 *
 * @param {object} api OpenAPIBackend instance
 */
const AdminRoutes = (api) => [
  {
    method: 'GET',
    path: '/health',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'health'],
      description: 'GET health'
    }
  },
  {
    method: 'GET',
    path: '/oracles',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'admin', 'sampled'],
      description: 'GET Oracles'
    }
  },
  {
    method: 'POST',
    path: '/oracles',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'admin', 'sampled'],
      description: 'Create Oracles'
    }
  },
  {
    method: 'PUT',
    path: '/oracles/{ID}',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'admin', 'sampled'],
      description: 'Update Oracle'
    }
  },
  {
    method: 'DELETE',
    path: '/oracles/{ID}',
    handler: (req, h) => handleRequest(api, req, h),
    config: {
      tags: ['api', 'admin', 'sampled'],
      description: 'Delete Oracle by ID'
    }
  }
]

module.exports = { APIRoutes, AdminRoutes }
