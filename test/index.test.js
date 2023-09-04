const { strictEqual: eq, rejects } = require('node:assert');
const { afterEach, describe, xdescribe, it } = require('zunit');
const Scanner = require('../lib/Scanner')

describe('PG Scanner', () => {

  afterEach(async () => {
    if (!scanner) return;
    await scanner.disconnect();
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
    it('should tolerate not custom tables', async () => {
      const scanner = await connect();
      const tables = await scanner.scan();
      eq(tables.length, 0);
    })

    // it('should', async () => {
    //   eq(tables[0].schema, 'test_schema');
    //   eq(tables[0].table, 'test_table');
    //   eq(tables[0].sequenceScans, 0);
    //   eq(tables[0].rowsScanned, 0);
    // })
  });

  describe('Disconnect', () => {

  })
})

function connect() {
  const config = {
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres'
  }
  scanner = new Scanner(config);
  return scanner.connect();
}