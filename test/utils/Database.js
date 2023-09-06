const { Client } = require('pg');

module.exports = class Database {
  #config
  #tableName
  #index = 1;

  constructor(config, tableName) {
    this.#config = config
    this.#tableName = tableName
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

  async createTable() {
    return this.withClient(async (client) => {
      const query = `CREATE TABLE ${this.#tableName} (id SERIAL PRIMARY KEY)`;
      await client.query(query);
    });
  }

  async readTable(n = 1) {
    return this.withClient(async (client) => {
      for (let i = 0; i < n; i++) {
        const query = `SELECT * FROM ${this.#tableName}`;
        await client.query(query);
      }
    });
  }

  async insertRow(n = 1) {
    return this.withClient(async (client) => {
      for (let i = 0; i < n; i++) {
        const query = `INSERT INTO ${this.#tableName} VALUES ($1)`;
        await client.query(query, [this.#index++]);
      }
    });
  }

  async nuke() {
    return this.withClient(async (client) => {
      const results = await client.query("SELECT relname FROM pg_stat_all_tables WHERE schemaname = 'public'");
      const dropTables = results.rows.map(async ({ relname }) => {
        return await client.query(`DROP TABLE ${relname}`);
      });
      await Promise.all(dropTables);
    })
  }
}