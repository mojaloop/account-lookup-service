module.exports = {
  DATABASE: {
    HOST: 'mysql-als',
    SCHEMA: 'account_lookup'
  },
  SWITCH_ENDPOINT: 'http://central-ledger:3001',
  ALS_GENERAL_CACHE_CONFIG: {
    CACHE_ENABLED: false,
    MAX_BYTE_SIZE: 10000000,
    EXPIRES_IN_MS: 61000
  },
  CENTRAL_SHARED_PARTICIPANT_CACHE_CONFIG: {
    expiresIn: 1,
    generateTimeout: 30000,
    getDecoratedValue: true
  },
  CENTRAL_SHARED_ENDPOINT_CACHE_CONFIG: {
    expiresIn: 180000,
    generateTimeout: 30000,
    getDecoratedValue: true
  }
}
