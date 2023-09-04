const { ok, strictEqual: eq, rejects } = require('node:assert');
const { before, afterEach, describe, xdescribe, it } = require('zunit');
const { Client } = require('pg');
const Scanner = require('../lib/Scanner')

describe('PG Scanner', () => {

  let scanner;

  const config = {
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres'
  }

  before(async () => {
    await nuke();
  })

  afterEach(async () => {
    if (!scanner) return;
    await scanner.disconnect();
  })

  afterEach(async () => {
    await nuke();
  })


  describe('Connect', () => {
    it('should connect successfully', async () => {
      connect();
    })

    it('should report connection errors', async () => {
      const scanner = new Scanner({ host: 'doesnotexist', port: 1111, user: 'bob' });
      await rejects(() => scanner.connect(), (err) => {
        eq(err.message, 'Error connecting to doesnotexist:1111 as bob: getaddrinfo ENOTFOUND doesnotexist');
        eq(err.code, 'ERR_PG_SCANNER_CONNECTION_ERROR');
        eq(err.cause.code, 'ENOTFOUND')
        return true;
      })
    })
  })

  describe('Scan', () => {
    it('should ignore standard tables', async () => {
      const scanner = await connect();
      const tables = await scanner.scan();
      eq(tables.length, 0);
    })

    it('should return stats for custom tables', async () => {
      await createTable('test_table');

      const scanner = await connect();
      const [stats] = await scanner.scan();
      ok(stats, 'No custom tables');
      eq(stats.schema, 'public');
      eq(stats.table, 'test_table');

      console.log({ stats });
      eq(stats.sequentialScans, 0);
      eq(stats.rowsScanned, 0);
    })
  });

  describe('Disconnect', () => {

  })

  function connect() {
    scanner = new Scanner(config);
    return scanner.connect();
  }

  async function createTable(tableName) {
    const client = new Client(config);
    await client.connect();
    await client.query(`CREATE TABLE ${tableName} ( id INTEGER PRIMARY KEY )`);
    await client.end();
  }

  async function nuke() {
    const client = new Client(config);
    await client.connect();
    const results = await client.query("SELECT relname FROM pg_stat_all_tables WHERE schemaname = 'public'");
    const dropTables = results.rows.map(({ relname }) => {
      return client.query(`DROP TABLE ${relname}`);
    });
    await dropTables;
    await client.end();
  }
})

/*
CREATE TABLE test_table (
  id INTEGER PRIMARY KEY
);
SELECT * FROM pg_stat_all_tables WHERE schemaname = 'public';

SELECT * FROM test_table;

INSERT INTO test_table VALUES (1);
*/