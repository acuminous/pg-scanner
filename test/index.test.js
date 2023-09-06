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

  const database = new Database(config);
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
      await database.createTable('test_table')

      const scanner = await connect();

      const [stats] = await scanner.scan();
      ok(stats, 'No custom tables');
      eq(stats.schema, 'public');
      eq(stats.table, 'test_table');
      eq(stats.sequentialScans, '1');
      eq(stats.rowsScanned, '0');
    })

    it('should return the total number of sequential table scans after reading the table', async () => {
      await database.createTable('test_table')
      const scanner = await connect();

      const [stats1] = await scanner.scan();
      eq(stats1.sequentialScans, '1');

      await database.readTable('test_table')

      const [stats2] = await scanner.scan();
      eq(stats2.sequentialScans, '2');
    })

    it('should return the total number of rows read by sequential table scans after insertion', async () => {
      await database.createTable('test_table')
      const numberOfRows = 2;
      const numberOfReads = 3;
      const numberOfRowsScanned = numberOfRows * numberOfReads;

      await database.insertRow('test_table', numberOfRows);
      await database.readTable('test_table', numberOfReads);

      const scanner = await connect();
      const [stats] = await scanner.scan();
      eq(stats.rowsScanned, `${numberOfRowsScanned}`);
    })

    it('should return the difference between sequential rows read', async () => {
      await database.createTable('test_table');
      const startingNumberOfRows = 2;
      const startingNumberOfReads = 3;
      await database.insertRow('test_table', startingNumberOfRows);
      await database.readTable('test_table', startingNumberOfReads);

      const scanner = await connect();
      await scanner.scan();

      const additionalNumberOfRows = 3;
      const additionalNumberOfReads = 5;
      await database.insertRow('test_table', additionalNumberOfRows);
      await database.readTable('test_table', additionalNumberOfReads);

      const startingNumberOfRowsScanned = startingNumberOfRows * startingNumberOfReads;
      const additionalNumberOfRowsScanned = (startingNumberOfRows + additionalNumberOfRows) * additionalNumberOfReads;
      const totalNumberOfRowsScanned = startingNumberOfRowsScanned + additionalNumberOfRowsScanned;
      const delta = totalNumberOfRowsScanned - startingNumberOfRowsScanned;

      const [stats] = await scanner.scan();
      eq(stats.rowsScannedDelta, `${delta}`)
    })

    it('should return the difference between sequential rows read when there are multiple tables', async () => {
      const tableOne = 'test_table'
      await database.createTable(tableOne);
      const tableOneStartingNumberOfRows = 2;
      const tableOneStartingNumberOfReads = 3;
      await database.insertRow(tableOne, tableOneStartingNumberOfRows);
      await database.readTable(tableOne, tableOneStartingNumberOfReads);

      const scanner = await connect();
      await scanner.scan();

      const testTableTwo = 'test_table_2'
      await database.createTable(testTableTwo);
      const tableTwoStartingNumberOfRows = 4;
      const tableTwoStartingNumberOfReads = 7;
      await database.insertRow(testTableTwo, tableTwoStartingNumberOfRows);
      await database.readTable(testTableTwo, tableTwoStartingNumberOfReads);

      await database.readTable(tableOne);

      const [stats] = await scanner.scan();
      eq(stats.rowsScannedDelta, `2`)


    })
  });

  it('should work when the table has previous rows scanned rather than none')
  it('should work with really big numbers')

  describe('Disconnect', () => {

  })

  function connect() {
    scanner = new Scanner(config);
    return scanner.connect();
  }
})