const { Client } = require('pg');

module.exports = class Database {
  #config;
  #index = 1;

  constructor(config) {
    this.#config = config;
  }

  async withClient(callback) {
    const client = new Client(this.#config);
    try {
      await client.connect();
      await callback(client);
    } finally {
      await client.end();
    }
  }

  async createTable(tableName) {
    return this.withClient(async (client) => {
      const query = `CREATE TABLE ${tableName} (id SERIAL PRIMARY KEY)`;
      await client.query(query);
    });
  }

  async readTable(tableName, n = 1) {
    return this.withClient(async (client) => {
      for (let i = 0; i < n; i++) {
        const query = `SELECT * FROM ${tableName}`;
        await client.query(query);
      }
    });
  }

  async insertRow(tableName, n = 1) {
    return this.withClient(async (client) => {
      for (let i = 0; i < n; i++) {
        const query = `INSERT INTO ${tableName} VALUES ($1)`;
        await client.query(query, [this.#index++]);
      }
    });
  }

  async nuke() {
    return this.withClient(async (client) => {
      const results = await client.query("SELECT relname FROM pg_stat_all_tables WHERE schemaname = 'public'");
      const dropTables = results.rows.map(async ({ relname }) => client.query(`DROP TABLE ${relname}`));
      return Promise.all(dropTables);
    });
  }
};
