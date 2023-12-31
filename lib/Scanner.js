const { Client } = require('pg');
const { ConnectionError, InitialisationError, } = require('./Errors');

const INCLUDE_ALL = () => true;

module.exports = class Scanner {
  #config;
  #client;
  #initialised = false;
  #previousTableStats = [];
  #filter;

  constructor(options = {}) {
    this.#config = options.config;
    this.#filter = options.filter || INCLUDE_ALL;
  }

  async init() {
    this.#checkNotInitialised();
    await this.#scan();
    this.#initialised = true;
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
    try {
      await this.#connect();
      const rawTableStats = await this.#readDatabaseTableStats();
      const augmentedTableStats = this.#augmentTableStats(rawTableStats);
      this.#previousTableStats = augmentedTableStats;
      return { tables: augmentedTableStats };
    } finally {
      this.#disconnect();
    }
  }

  async #connect() {
    this.#client = new Client(this.#config);
    try {
      await this.#client.connect();
    } catch (cause) {
      const { host, port, database, user } = this.#client.connectionParameters;
      throw new ConnectionError(`Error connecting to ${host}:${port}/${database} as ${user}: ${cause.message}`, { cause });
    }
    return this;
  }

  async #disconnect() {
    return this.#client.end();
  }

  async #readDatabaseTableStats() {
    const { rows } = await this.#client.query("SELECT * FROM pg_stat_all_tables WHERE schemaName NOT IN ('pg_catalog' ,'pg_toast', 'information_schema') ORDER BY schemaName ASC, relname ASC");
    return rows.map(fromColumnNames).filter(this.#filter);
  }

  #augmentTableStats(rawTableStats) {
    return rawTableStats.map((tableStats) => {
      const previousTableStats = this.#findPreviousTableStats(tableStats.schema, tableStats.table);
      const rowsScannedDelta = tableStats.rowsScanned - previousTableStats.rowsScanned;
      const sequentialScansDelta = tableStats.sequentialScans - previousTableStats.sequentialScans;
      return { ...tableStats, rowsScannedDelta, sequentialScansDelta };
    });
  }

  #findPreviousTableStats(schema, table) {
    return this.#previousTableStats.find((entry) => entry.schema === schema && entry.table === table) || this.#getNewTableStats();
  }

  #getNewTableStats() {
    return { rowsScanned: BigInt(0), sequentialScans: BigInt(0) };
  }
};

// eslint-disable-next-line camelcase
function fromColumnNames({ schemaname, relname, seq_scan, seq_tup_read }) {
  return {
    schema: schemaname,
    table: relname,
    sequentialScans: BigInt(seq_scan),
    rowsScanned: BigInt(seq_tup_read),
  };
}
