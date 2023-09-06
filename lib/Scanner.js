const { Client } = require('pg');
const { ConnectionError } = require('./Errors')

const SCAN_SQL = 'SELECT * FROM pg_stat_all_tables ORDER BY schemaName ASC, relname ASC';

module.exports = class Scanner {
  #config;
  #client;
  #previousRowsScanned = 0;
  #previousStats = [];

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
    const stats = rows.filter(byCustomSchema)
      .map(toTableStats)
      .map((tableStats) => this.#toAugmentedTableStats(tableStats))
    this.#previousStats = stats;
    return stats;
  }

  #toAugmentedTableStats(tableStats) {
    const previousTableStats = this.#findPreviousTableStats(tableStats.schema, tableStats.table);
    const previousRowsScanned = previousTableStats?.rowsScanned || 0;
    const rowsScannedDelta = `${BigInt(tableStats.rowsScanned) - BigInt(previousRowsScanned)}`;
    return { ...tableStats, rowsScannedDelta };
  }

  #findPreviousTableStats(schema, table) {
    return this.#previousStats.find(entry => entry.schema === schema && entry.table === table)
  }

}

function byCustomSchema({ schemaname: schema }) {
  const standardSchemas = ['pg_catalog', 'pg_toast', 'information_schema'];
  return !(standardSchemas.includes(schema));
}

function toTableStats({ schemaname, relname, seq_scan, seq_tup_read }) {
  return {
    schema: schemaname,
    table: relname,
    sequentialScans: seq_scan,
    rowsScanned: seq_tup_read,
  }
}