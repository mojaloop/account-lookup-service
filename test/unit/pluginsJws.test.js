/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 --------------
 ******/

'use strict'

const Hapi = require('@hapi/hapi')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { Jws } = require('@mojaloop/sdk-standard-components')

const JwsSigner = Jws.signer

const FSPIOP_SOURCE = 'payerfsp'

const generateKeyPair = () => crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
})

const buildSignedHeaders = ({ signingKey, method, urlPath, body, source = FSPIOP_SOURCE, contentType = 'application/vnd.interoperability.parties+json;version=1.1' }) => {
  const signer = new JwsSigner({ signingKey })
  const reqOpts = {
    headers: {
      'content-type': contentType,
      accept: contentType.replace(';version=1.1', ';version=1'),
      date: new Date().toUTCString(),
      'fspiop-source': source,
      'fspiop-destination': 'payeefsp'
    },
    method,
    uri: `http://switch${urlPath}`,
    body
  }
  signer.sign(reqOpts)
  return reqOpts.headers
}

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'jws-als-'))

jest.mock('@hapi/good', () => ({ plugin: { name: 'stub-good', register () {} } }))
jest.mock('@hapi/basic', () => ({ plugin: { name: 'stub-basic', register () {} } }))
jest.mock('@now-ims/hapi-now-auth', () => ({ plugin: { name: 'stub-now-auth', register () {} } }))
jest.mock('hapi-auth-bearer-token', () => ({ plugin: { name: 'stub-bearer', register () {} } }))
jest.mock('@mojaloop/central-services-metrics', () => ({
  plugin: { plugin: { name: 'stub-metrics', register () {} } }
}))
jest.mock('@mojaloop/central-services-shared', () => {
  const actual = jest.requireActual('@mojaloop/central-services-shared')
  const s = (n) => ({ plugin: { name: n, register () {} } })
  return {
    ...actual,
    Util: {
      ...actual.Util,
      Hapi: {
        ...actual.Util.Hapi,
        APIDocumentation: s('stub-api-doc'),
        OpenapiBackendValidator: s('stub-openapi-validator'),
        FSPIOPHeaderValidation: { plugin: s('stub-header-validation') },
        HapiEventPlugin: s('stub-event-plugin')
      }
    }
  }
})

describe('plugins JWS validation', () => {
  describe('loadJwsKeys / watchJwsKeys helpers', () => {
    const { _loadJwsKeys, _watchJwsKeys } = require('../../src/plugins')

    it('loadJwsKeys returns empty for missing dir', () => {
      expect(_loadJwsKeys('/no/such/dir')).toEqual({})
    })

    it('loadJwsKeys returns empty for undefined', () => {
      expect(_loadJwsKeys(undefined)).toEqual({})
    })

    it('loadJwsKeys reads .pem files and ignores others', () => {
      const dir = makeTempDir()
      fs.writeFileSync(path.join(dir, 'fsp1.pem'), 'KEY-A')
      fs.writeFileSync(path.join(dir, 'fsp2.pem'), 'KEY-B')
      fs.writeFileSync(path.join(dir, 'readme.txt'), 'skip')

      const keys = _loadJwsKeys(dir)
      expect(keys.fsp1.toString()).toBe('KEY-A')
      expect(keys.fsp2.toString()).toBe('KEY-B')
      expect(keys.readme).toBeUndefined()

      fs.rmSync(dir, { recursive: true, force: true })
    })

    it('watchJwsKeys returns null for missing dir', () => {
      expect(_watchJwsKeys('/no/such/dir', {})).toBeNull()
    })

    it('watchJwsKeys returns null for undefined', () => {
      expect(_watchJwsKeys(undefined, {})).toBeNull()
    })

    it('watchJwsKeys detects added key', async () => {
      const dir = makeTempDir()
      const keyMap = {}
      const watcher = _watchJwsKeys(dir, keyMap)

      fs.writeFileSync(path.join(dir, 'newfsp.pem'), 'NEW-KEY')
      const deadline = Date.now() + 3000
      while (!keyMap.newfsp && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      expect(keyMap.newfsp).toBeDefined()

      watcher.close()
      fs.rmSync(dir, { recursive: true, force: true })
    })

    it('watchJwsKeys detects removed key', async () => {
      const dir = makeTempDir()
      fs.writeFileSync(path.join(dir, 'old.pem'), 'OLD')
      const keyMap = { old: Buffer.from('OLD') }
      const watcher = _watchJwsKeys(dir, keyMap)

      fs.rmSync(path.join(dir, 'old.pem'))
      const deadline = Date.now() + 3000
      while (keyMap.old && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      expect(keyMap.old).toBeUndefined()

      watcher.close()
      fs.rmSync(dir, { recursive: true, force: true })
    })

    it('watchJwsKeys ignores non-pem files', async () => {
      const dir = makeTempDir()
      const keyMap = {}
      const watcher = _watchJwsKeys(dir, keyMap)

      fs.writeFileSync(path.join(dir, 'notes.txt'), 'hi')
      await new Promise(resolve => setTimeout(resolve, 200))
      expect(keyMap).toEqual({})

      watcher.close()
      fs.rmSync(dir, { recursive: true, force: true })
    })
  })

  describe('registerPlugins JWS onPostAuth (real Hapi server)', () => {
    const { privateKey, publicKey } = generateKeyPair()
    const Config = require('../../src/lib/config')

    const createServer = async ({ keysDir, validatePutParties = false } = {}) => {
      const orig = {
        validate: Config.JWS_VALIDATE,
        dir: Config.JWS_VERIFICATION_KEYS_DIRECTORY,
        putParties: Config.JWS_VALIDATE_PUT_PARTIES
      }
      Config.JWS_VALIDATE = true
      Config.JWS_VERIFICATION_KEYS_DIRECTORY = keysDir
      Config.JWS_VALIDATE_PUT_PARTIES = validatePutParties

      const server = new Hapi.Server({
        routes: { payload: { output: 'stream', parse: true } }
      })

      const { registerPlugins } = require('../../src/plugins')
      await registerPlugins(server, { matchOperation: () => ({}) })

      server.ext('onPreResponse', (req, h) => {
        if (req.response && req.response.name === 'FSPIOPError') {
          const { apiErrorCode } = req.response
          return h.response({ errorCode: apiErrorCode.code }).code(apiErrorCode.httpStatusCode)
        }
        return h.continue
      })

      const ok = (_req, h) => h.response({ ok: true }).code(200)
      server.route([
        { method: 'POST', path: '/participants/{Type}/{ID}', handler: ok },
        { method: 'PUT', path: '/participants/{Type}/{ID}', handler: ok },
        { method: 'GET', path: '/participants/{Type}/{ID}', handler: ok },
        { method: 'GET', path: '/parties/{Type}/{ID}', handler: ok },
        { method: 'PUT', path: '/parties/{Type}/{ID}', handler: ok },
        { method: 'PUT', path: '/parties/{Type}/{ID}/error', handler: ok },
        { method: 'GET', path: '/oracles', handler: ok }
      ])

      Object.assign(Config, {
        JWS_VALIDATE: orig.validate,
        JWS_VERIFICATION_KEYS_DIRECTORY: orig.dir,
        JWS_VALIDATE_PUT_PARTIES: orig.putParties
      })

      return server
    }

    const cleanup = (server, dir) => {
      if (server.app.jwsKeyWatcher) server.app.jwsKeyWatcher.close()
      if (dir) fs.rmSync(dir, { recursive: true, force: true })
    }

    it('accepts a valid signed POST /participants/{Type}/{ID}', async () => {
      const dir = makeTempDir()
      fs.writeFileSync(path.join(dir, `${FSPIOP_SOURCE}.pem`), publicKey)
      const server = await createServer({ keysDir: dir })

      const body = { fspId: 'payerfsp' }
      const headers = buildSignedHeaders({
        signingKey: privateKey,
        method: 'POST',
        urlPath: '/participants/MSISDN/12345',
        body,
        contentType: 'application/vnd.interoperability.participants+json;version=1.1'
      })
      const res = await server.inject({ method: 'POST', url: '/participants/MSISDN/12345', headers, payload: body })
      expect(res.statusCode).toBe(200)

      await server.stop()
      cleanup(server, dir)
    })

    it('rejects tampered participants body with 3105', async () => {
      const dir = makeTempDir()
      fs.writeFileSync(path.join(dir, `${FSPIOP_SOURCE}.pem`), publicKey)
      const server = await createServer({ keysDir: dir })

      const body = { fspId: 'payerfsp' }
      const headers = buildSignedHeaders({
        signingKey: privateKey,
        method: 'POST',
        urlPath: '/participants/MSISDN/12345',
        body,
        contentType: 'application/vnd.interoperability.participants+json;version=1.1'
      })
      const res = await server.inject({ method: 'POST', url: '/participants/MSISDN/12345', headers, payload: { fspId: 'tampered' } })
      expect(res.statusCode).toBe(400)
      expect(JSON.parse(res.payload).errorCode).toBe('3105')

      cleanup(server, dir)
    })

    it('rejects unknown source with 3105', async () => {
      const dir = makeTempDir()
      fs.writeFileSync(path.join(dir, `${FSPIOP_SOURCE}.pem`), publicKey)
      const server = await createServer({ keysDir: dir })

      const body = { fspId: 'unknownfsp' }
      const headers = buildSignedHeaders({
        signingKey: privateKey,
        method: 'POST',
        urlPath: '/participants/MSISDN/12345',
        body,
        source: 'unknownfsp',
        contentType: 'application/vnd.interoperability.participants+json;version=1.1'
      })
      const res = await server.inject({ method: 'POST', url: '/participants/MSISDN/12345', headers, payload: body })
      expect(res.statusCode).toBe(400)
      expect(JSON.parse(res.payload).errorCode).toBe('3105')

      cleanup(server, dir)
    })

    it('GET requests bypass JWS validation', async () => {
      const dir = makeTempDir()
      fs.writeFileSync(path.join(dir, `${FSPIOP_SOURCE}.pem`), publicKey)
      const server = await createServer({ keysDir: dir })

      const res = await server.inject({ method: 'GET', url: '/parties/MSISDN/12345' })
      expect(res.statusCode).toBe(200)

      cleanup(server, dir)
    })

    it('non-FSPIOP resources (admin /oracles) bypass JWS validation', async () => {
      const dir = makeTempDir()
      fs.writeFileSync(path.join(dir, `${FSPIOP_SOURCE}.pem`), publicKey)
      const server = await createServer({ keysDir: dir })

      const res = await server.inject({ method: 'GET', url: '/oracles' })
      expect(res.statusCode).toBe(200)

      cleanup(server, dir)
    })

    it('PUT /parties bypasses validation by default (JWS_VALIDATE_PUT_PARTIES=false)', async () => {
      const dir = makeTempDir()
      fs.writeFileSync(path.join(dir, `${FSPIOP_SOURCE}.pem`), publicKey)
      const server = await createServer({ keysDir: dir, validatePutParties: false })

      const res = await server.inject({ method: 'PUT', url: '/parties/MSISDN/12345', payload: { party: { partyIdInfo: {} } } })
      expect(res.statusCode).toBe(200)

      cleanup(server, dir)
    })

    it('PUT /parties/{Type}/{ID}/error bypasses validation by default', async () => {
      const dir = makeTempDir()
      fs.writeFileSync(path.join(dir, `${FSPIOP_SOURCE}.pem`), publicKey)
      const server = await createServer({ keysDir: dir, validatePutParties: false })

      const res = await server.inject({ method: 'PUT', url: '/parties/MSISDN/12345/error', payload: { errorInformation: {} } })
      expect(res.statusCode).toBe(200)

      cleanup(server, dir)
    })

    it('PUT /parties is validated when JWS_VALIDATE_PUT_PARTIES=true', async () => {
      const dir = makeTempDir()
      fs.writeFileSync(path.join(dir, `${FSPIOP_SOURCE}.pem`), publicKey)
      const server = await createServer({ keysDir: dir, validatePutParties: true })

      const unsigned = await server.inject({ method: 'PUT', url: '/parties/MSISDN/12345', payload: { party: {} } })
      expect(unsigned.statusCode).toBe(400)
      expect(JSON.parse(unsigned.payload).errorCode).toBe('3105')

      const body = { party: { partyIdInfo: { partyIdType: 'MSISDN', partyIdentifier: '12345' } } }
      const headers = buildSignedHeaders({
        signingKey: privateKey,
        method: 'PUT',
        urlPath: '/parties/MSISDN/12345',
        body
      })
      const signed = await server.inject({ method: 'PUT', url: '/parties/MSISDN/12345', headers, payload: body })
      expect(signed.statusCode).toBe(200)

      cleanup(server, dir)
    })

    it('PUT /participants is always validated regardless of JWS_VALIDATE_PUT_PARTIES', async () => {
      const dir = makeTempDir()
      fs.writeFileSync(path.join(dir, `${FSPIOP_SOURCE}.pem`), publicKey)
      const server = await createServer({ keysDir: dir, validatePutParties: false })

      const res = await server.inject({ method: 'PUT', url: '/participants/MSISDN/12345', payload: { fspId: 'x' } })
      expect(res.statusCode).toBe(400)
      expect(JSON.parse(res.payload).errorCode).toBe('3105')

      cleanup(server, dir)
    })

    it('handles missing keys directory gracefully (still rejects)', async () => {
      const server = await createServer({ keysDir: '/no/such/dir' })

      const body = { fspId: 'payerfsp' }
      const headers = buildSignedHeaders({
        signingKey: privateKey,
        method: 'POST',
        urlPath: '/participants/MSISDN/12345',
        body,
        contentType: 'application/vnd.interoperability.participants+json;version=1.1'
      })
      const res = await server.inject({ method: 'POST', url: '/participants/MSISDN/12345', headers, payload: body })
      expect(res.statusCode).toBe(400)
      expect(JSON.parse(res.payload).errorCode).toBe('3105')
    })

    it('hot-reloads added and removed keys via fs.watch', async () => {
      const dir = makeTempDir()
      fs.writeFileSync(path.join(dir, `${FSPIOP_SOURCE}.pem`), publicKey)
      const server = await createServer({ keysDir: dir })
      expect(server.app.jwsKeyWatcher).toBeDefined()

      const { privateKey: pk2, publicKey: pub2 } = generateKeyPair()
      fs.writeFileSync(path.join(dir, 'newfsp.pem'), pub2)
      const deadline = Date.now() + 3000
      let added = false
      while (Date.now() < deadline) {
        const body = { fspId: 'newfsp' }
        const headers = buildSignedHeaders({
          signingKey: pk2,
          method: 'POST',
          urlPath: '/participants/MSISDN/22222',
          body,
          source: 'newfsp',
          contentType: 'application/vnd.interoperability.participants+json;version=1.1'
        })
        const res = await server.inject({ method: 'POST', url: '/participants/MSISDN/22222', headers, payload: body })
        if (res.statusCode === 200) { added = true; break }
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      expect(added).toBe(true)

      fs.rmSync(path.join(dir, 'newfsp.pem'))
      const deadline2 = Date.now() + 3000
      let removed = false
      while (Date.now() < deadline2) {
        const body = { fspId: 'newfsp' }
        const headers = buildSignedHeaders({
          signingKey: pk2,
          method: 'POST',
          urlPath: '/participants/MSISDN/33333',
          body,
          source: 'newfsp',
          contentType: 'application/vnd.interoperability.participants+json;version=1.1'
        })
        const res = await server.inject({ method: 'POST', url: '/participants/MSISDN/33333', headers, payload: body })
        if (res.statusCode === 400) { removed = true; break }
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      expect(removed).toBe(true)

      await server.stop()
      fs.rmSync(dir, { recursive: true, force: true })
    })
  })
})
