const { ok, strictEqual: eq, rejects } = require('node:assert');
const { before, afterEach, describe, xdescribe, it } = require('zunit');
const Scanner = require('../lib/Scanner')
const Database = require('./utils/Database')
const NullScanner = require('./utils/NullScanner')


describe('PG Scanner', () => {

  const config = {
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres'
  }

  const database = new Database(config, 'test_table');
  let scanner = new NullScanner();

  before(async () => {
    await database.nuke();
  })

  afterEach(async () => {
    await scanner.disconnect();
  })

  afterEach(async () => {
    await database.nuke();
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
      await database.createTable()

      const scanner = await connect();

      const [stats] = await scanner.scan();
      ok(stats, 'No custom tables');
      eq(stats.schema, 'public');
      eq(stats.table, 'test_table');
      eq(stats.sequentialScans, '1');
      eq(stats.rowsScanned, '0');
    })

    it('should return correct sequentialScans value after reading table', async () => {
      await database.createTable()
      const scanner = await connect();

      const [stats1] = await scanner.scan();
      eq(stats1.sequentialScans, '1');

      await database.readTable()

      const [stats2] = await scanner.scan();
      eq(stats2.sequentialScans, '2');
    })

    it('should return the total number of rows read by sequential table scans after insertion', async () => {
      await database.createTable()
      const numberOfRows = 2;
      const numberOfReads = 3;
      const numberOfRowsScanned = numberOfRows * numberOfReads;

      await database.insertRow(numberOfRows);
      await database.readTable(numberOfReads);

      const scanner = await connect();
      const [stats] = await scanner.scan();
      eq(stats.rowsScanned, `${numberOfRowsScanned}`);
    })
  });

  describe('Disconnect', () => {

  })

  function connect() {
    scanner = new Scanner(config);
    return scanner.connect();
  }
})