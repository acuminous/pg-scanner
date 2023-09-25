const { Scanner } = require('..');

const config = {
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
};

const scanner = new Scanner(config);

(async () => {
  await scanner.init();
  scheduleScan(10000);
})();

function scheduleScan(delay) {
  setTimeout(async () => {
    const stats = await scanner.scan();
    console.log({ stats });
    scheduleScan(delay);
  }, delay);
}
