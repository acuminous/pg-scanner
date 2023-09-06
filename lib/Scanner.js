const { Client } = require('pg');
const { ConnectionError } = require('./Errors')

const SCAN_SQL = 'SELECT * FROM pg_stat_all_tables';

module.exports = class Scanner {
  #config;
  #client;
  #previousRowsScanned = 0;

  constructor(config) {
    this.#config = config;
  }

  async connect() {
    this.#client = new Client(this.#config);
    try {
      await this.#client.connect();
    } catch (cause) {
      throw new ConnectionError(`Error connecting to ${this.#config.host}:${this.#config.port} as ${this.#config.user}: ${cause.message}`, { cause })
    }
    return this;
  }

  async disconnect() {
    return this.#client.end();
  }

  async scan() {
    const { rows } = await this.#client.query(SCAN_SQL);
    return rows.filter(byCustomSchema)
      .map(toStats)
      .map((results) => this.#toAugmentedResults(results))
  }

  #toAugmentedResults(results) {
    const rowsScannedDelta = `${BigInt(results.rowsScanned) - BigInt(this.#previousRowsScanned)}`;
    const augmentedResults = { ...results, rowsScannedDelta };
    this.#previousRowsScanned = augmentedResults.rowsScanned;
    return augmentedResults;
  }
}

function byCustomSchema({ schemaname: schema }) {
  const standardSchemas = ['pg_catalog', 'pg_toast', 'information_schema'];
  return !(standardSchemas.includes(schema));
}

function toStats({ schemaname, relname, seq_scan, seq_tup_read }) {
  return {
    schema: schemaname,
    table: relname,
    sequentialScans: seq_scan,
    rowsScanned: seq_tup_read,
  }
}