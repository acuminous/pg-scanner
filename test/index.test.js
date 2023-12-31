const { ok, strictEqual: eq, rejects } = require('node:assert');
const { before, afterEach, describe, it } = require('zunit');
const Scanner = require('../lib/Scanner');
const Database = require('./utils/Database');

describe('PG Scanner', () => {
  const config = {
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres',
  };

  const database = new Database(config);
  let scanner;

  before(async () => {
    await database.nuke();
  });

  afterEach(async () => {
    await database.nuke();
  });

  describe('init', () => {
    it('should reject repeated initialisation attempts', async () => {
      await initialiseScanner();
      await rejects(() => scanner.init(), (err) => {
        eq(err.message, 'The scanner is already initialised');
        eq(err.code, 'ERR_PG_SCANNER_INITIALISATION_ERROR');
        return true;
      });
    });

    it('should report connection errors', async () => {
      const badConfig = { host: 'doesnotexist-wibble-panda-totem.com', port: 1111, database: 'db', user: 'bob' };
      scanner = new Scanner({ config: badConfig });

      await rejects(() => scanner.init(), (err) => {
        eq(err.message, 'Error connecting to doesnotexist-wibble-panda-totem.com:1111/db as bob: getaddrinfo ENOTFOUND doesnotexist-wibble-panda-totem.com');
        eq(err.code, 'ERR_PG_SCANNER_CONNECTION_ERROR');
        eq(err.cause.code, 'ENOTFOUND');
        return true;
      });
    });
  });

  describe('scan', () => {
    it('should reject when not initiliased', async () => {
      scanner = new Scanner(config);
      await rejects(() => scanner.scan(), (err) => {
        eq(err.message, 'Please initialise the scanner');
        eq(err.code, 'ERR_PG_SCANNER_INITIALISATION_ERROR');
        return true;
      });
    });

    it('should ignore standard tables', async () => {
      await initialiseScanner();
      const stats = await scanner.scan();
      eq(stats.tables.length, 0);
    });

    it('should filter by specified schemas/tables', async () => {
      await database.createTable('exclude_table');
      await database.createTable('include_table');

      const filter = ({ schema, table }) => {
        if (schema === 'public' && table === 'exclude_table') return false;
        return true;
      };
      scanner = new Scanner({ config, filter });

      await scanner.init();
      const stats = await scanner.scan();

      eq(stats.tables.length, 1);
    });

    it('should return stats for custom tables', async () => {
      await database.createTable('test_table');
      await initialiseScanner();

      const { tables: [stats] } = await scanner.scan();
      ok(stats, 'No custom tables');
      eq(stats.schema, 'public');
      eq(stats.table, 'test_table');
      eq(stats.sequentialScans, BigInt(1));
      eq(stats.rowsScanned, BigInt(0));
    });

    it('should return the total number of sequential table scans after reading the table', async () => {
      await database.createTable('test_table');
      await initialiseScanner();

      const { tables: [stats1] } = await scanner.scan();
      eq(stats1.sequentialScans, BigInt(1));

      await database.readTable('test_table');

      const { tables: [stats2] } = await scanner.scan();
      eq(stats2.sequentialScans, BigInt(2));
    });

    it('should return the total number of rows read by sequential table scans after insertion', async () => {
      const tableName = 'test_table';
      const numberOfRows = 2;
      const numberOfReads = 3;
      await setupTable(tableName, numberOfRows, numberOfReads);

      await initialiseScanner();
      const { tables: [stats] } = await scanner.scan();

      const numberOfRowsScanned = numberOfRows * numberOfReads;
      eq(stats.rowsScanned, BigInt(numberOfRowsScanned));
    });

    it('should return the difference between sequential scans', async () => {
      const tableName = 'test_table';
      const startingNumberOfRows = 2;
      const startingNumberOfReads = 3;
      await setupTable(tableName, startingNumberOfRows, startingNumberOfReads);

      await initialiseScanner();
      await scanner.scan();

      const additionalNumberOfRows = 3;
      const additionalNumberOfReads = 5;
      await database.insertRow(tableName, additionalNumberOfRows);
      await database.readTable(tableName, additionalNumberOfReads);

      const delta = additionalNumberOfReads;

      const { tables: [stats] } = await scanner.scan();
      eq(stats.sequentialScansDelta, BigInt(delta));
    });

    it('should return the difference between rows read', async () => {
      const tableName = 'test_table';
      const startingNumberOfRows = 2;
      const startingNumberOfReads = 3;
      await setupTable(tableName, startingNumberOfRows, startingNumberOfReads);

      await initialiseScanner();
      await scanner.scan();

      const additionalNumberOfRows = 3;
      const additionalNumberOfReads = 5;
      await database.insertRow(tableName, additionalNumberOfRows);
      await database.readTable(tableName, additionalNumberOfReads);

      const startingNumberOfRowsScanned = startingNumberOfRows * startingNumberOfReads;
      const additionalNumberOfRowsScanned = (startingNumberOfRows + additionalNumberOfRows) * additionalNumberOfReads;
      const totalNumberOfRowsScanned = startingNumberOfRowsScanned + additionalNumberOfRowsScanned;
      const delta = totalNumberOfRowsScanned - startingNumberOfRowsScanned;

      const { tables: [stats] } = await scanner.scan();
      eq(stats.rowsScannedDelta, BigInt(delta));
    });

    it('should return the difference between rows read when there are multiple tables', async () => {
      const tableOne = 'test_table';
      const tableOneStartingNumberOfRows = 2;
      const tableOneStartingNumberOfReads = 3;
      await setupTable(tableOne, tableOneStartingNumberOfRows, tableOneStartingNumberOfReads);

      const tableTwo = 'test_table_2';
      const tableTwoStartingNumberOfRows = 4;
      const tableTwoStartingNumberOfReads = 7;
      await setupTable(tableTwo, tableTwoStartingNumberOfRows, tableTwoStartingNumberOfReads);

      await initialiseScanner();

      await scanner.scan();
      await database.readTable(tableOne);
      const { tables: [stats] } = await scanner.scan();

      eq(stats.rowsScannedDelta, BigInt(2));
    });
  });

  async function initialiseScanner() {
    scanner = new Scanner({ config });
    await scanner.init();
  }

  async function setupTable(tableName, numberOfRows, numberOfReads) {
    await database.createTable(tableName);
    await database.insertRow(tableName, numberOfRows);
    await database.readTable(tableName, numberOfReads);
  }
});
