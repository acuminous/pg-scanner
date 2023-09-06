const { Client } = require('pg');

module.exports = class DBHandler {
  #config
  #tableName

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
    await this.withClient(async (client) => {
      const query = `CREATE TABLE ${this.#tableName} (id SERIAL PRIMARY KEY)`;
      await client.query(query);
    });
  }

  async readTable() {
    await this.withClient(async (client) => {
      const query = `SELECT * FROM ${this.#tableName}`;
      await client.query(query);
    });
  }

  async insertRow() {
    await this.withClient(async (client) => {
      const query = `INSERT INTO ${this.#tableName} VALUES (1)`;
      await client.query(query);
    });
  }
}