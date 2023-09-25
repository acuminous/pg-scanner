/* eslint no-console: 0 */
const { Scanner } = require('..');

const config = {
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
};

const excluded = [
  'ignore_me',
  'ignore_me_too',
];

const filter = ({ schema, table }) => {
  if (excluded.includes(`${schema}.${table}`)) return false;
  return true;
};

const scanner = new Scanner({ config, filter });

(async () => {
  await scanner.init();
  scheduleScan(1000);
})();

function scheduleScan(delay) {
  setTimeout(async () => {
    const stats = await scanner.scan();
    dump(stats);
    scheduleScan(delay);
  }, delay);
}

function dump(stats) {
  const serializer = (_, value) => (typeof value === 'bigint' ? value.toString() : value);
  const text = JSON.stringify(stats, serializer);
  console.log(text);
}
