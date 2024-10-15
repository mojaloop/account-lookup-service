const {
  PROXY_HOST,
  PROXY_PORT,
  PROXY_NAME,
  CL_PORT
} = process.env

const PARTY_ID_TYPE = 'IBAN' // for proxy testing
const PAYER_DFSP = 'testPayerDfsp'

module.exports = {
  PROXY_HOST,
  PROXY_PORT,
  PROXY_NAME,
  CL_PORT,
  PARTY_ID_TYPE,
  PAYER_DFSP
}
