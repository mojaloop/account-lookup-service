'use strict'

const migrationsDirectory = '../migrations'
const seedsDirectory = '../seeds'

const Config = require('../src/lib/config')

module.exports = {
  ...Config.DATABASE,
  version: '5.7',
  migrations: {
    directory: migrationsDirectory,
    tableName: 'migration'
  },
  seeds: {
    directory: seedsDirectory,
    loadExtensions: ['.js']
  }
}
