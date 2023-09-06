const { Client } = require('pg');
const { ConnectionError, InitialisationError, } = require('./Errors')

const SCAN_SQL = 'SELECT * FROM pg_stat_all_tables ORDER BY schemaName ASC, relname ASC';

module.exports = class Scanner {
  #config;
  #client;
  #initialised = false;
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

  async init() {
    this.#scan();
    this.#initialised = true;
    return this;
  }

  async scan() {
    this.#checkInitilised();
    return this.#scan();
  }

  async #scan() {
    const rawStats = await this.#readDatabaseTableStats();
    const decoratedStats = this.#decorateStats(rawStats);
    this.#previousStats = decoratedStats;
    return decoratedStats;
  }

  async #readDatabaseTableStats() {
    const { rows } = await this.#client.query(SCAN_SQL);
    return rows.filter(byCustomSchema).map(fromColumnNames);
  }

  #checkInitilised() {
    if (!this.#initialised) throw new InitialisationError('Please initialise the scanner');
  }

  #decorateStats(tableStats) {
    return tableStats.map((tableStats) => this.#toAugmentedTableStats(tableStats));
  }

  #toAugmentedTableStats(tableStats) {
    const previousTableStats = this.#findPreviousTableStats(tableStats.schema, tableStats.table);
    const rowsScannedDelta = tableStats.rowsScanned - previousTableStats.rowsScanned;
    const sequentialScansDelta = tableStats.sequentialScans - previousTableStats.sequentialScans;
    return { ...tableStats, rowsScannedDelta, sequentialScansDelta };
  }

  #findPreviousTableStats(schema, table) {
    return this.#previousStats.find(entry => entry.schema === schema && entry.table === table) || this.#getNewTableStats();
  }

  #getNewTableStats() {
    return { rowsScanned: BigInt(0), sequentialScans: BigInt(0) }
  }
}

function byCustomSchema({ schemaname: schema }) {
  const standardSchemas = ['pg_catalog', 'pg_toast', 'information_schema'];
  return !(standardSchemas.includes(schema));
}

function fromColumnNames({ schemaname, relname, seq_scan, seq_tup_read }) {
  return {
    schema: schemaname,
    table: relname,
    sequentialScans: BigInt(seq_scan),
    rowsScanned: BigInt(seq_tup_read),
  }
}