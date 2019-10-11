'use strict'

const migrationsDirectory = '../migrations'
const seedsDirectory = '../seeds'

const Config = require('../src/lib/config')

module.exports = {
  client: 'mysql',
  version: '5.7',
  connection: Config.DATABASE.connection,
  pool: Config.DATABASE.pool,
  migrations: {
    directory: migrationsDirectory,
    tableName: 'migration'
  },
  seeds: {
    directory: seedsDirectory,
    loadExtensions: ['.js']
  }
}
