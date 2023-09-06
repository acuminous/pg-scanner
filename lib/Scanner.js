const { Client } = require('pg');
const { ConnectionError, InitialisationError, } = require('./Errors')

module.exports = class Scanner {
  #config;
  #client;
  #initialised = false;
  #previousStats = [];
  #filter;

  constructor(config, filter = () => true) {
    this.#config = config;
    this.#filter = filter
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
    this.#checkNotInitialised();
    await this.#scan();
    this.#initialised = true;
    return this;
  }

  async scan() {
    this.#checkInitialised();
    return this.#scan();
  }

  #checkNotInitialised() {
    if (this.#initialised) throw new InitialisationError('The scanner is already initialised');
  }

  #checkInitialised() {
    if (!this.#initialised) throw new InitialisationError('Please initialise the scanner');
  }

  async #scan() {
    const rawStats = await this.#readDatabaseTableStats();
    const decoratedStats = this.#decorateStats(rawStats);
    this.#previousStats = decoratedStats;
    return decoratedStats;
  }

  async #readDatabaseTableStats() {
    const { rows } = await this.#client.query("SELECT * FROM pg_stat_all_tables WHERE schemaName NOT IN ('pg_catalog' ,'pg_toast', 'information_schema') ORDER BY schemaName ASC, relname ASC");
    return rows.map(fromColumnNames).filter(this.#filter);
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

function fromColumnNames({ schemaname, relname, seq_scan, seq_tup_read }) {
  return {
    schema: schemaname,
    table: relname,
    sequentialScans: BigInt(seq_scan),
    rowsScanned: BigInt(seq_tup_read),
  }
}