const { Client } = require('pg');
const { ConnectionError } = require('./Errors')

const SCAN_SQL = 'SELECT * FROM pg_stat_all_tables';

module.exports = class Scanner {
  #config;
  #client;

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
    const results = await this.#client.query(SCAN_SQL);
    return results.rows.filter(byCustomSchema).map(toScanResults)
  }
}

function byCustomSchema({ schemaname: schema }) {
  const standardSchemas = ['pg_catalog', 'pg_toast', 'information_schema'];
  return !(standardSchemas.includes(schema));
}

function toScanResults({ schemaname, relname, seq_scan, seq_tup_read }) {
  return {
    schema: schemaname,
    table: relname,
    sequentialScans: seq_scan,
    rowsScanned: seq_tup_read,
  }
}