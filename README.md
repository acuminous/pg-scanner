# PG-Scanner

PG-Scanner is a library which reports statistics about PostgreSQL databasesstatistics.

## TL;DR

```js
const { Scanner } = require('pg-scanner');

const config = {
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "password",
  database: "mydb",
};

const scanner = new Scanner(config);

async(() => {
  await scanner.init();
  scheduleScan(60 * 60 * 1000);
})();

function scheduleScan(delay) {
  setTimeout(async () => {
    const stats = await scanner.scan()
    console.log({ stats });
    scheduleScan(delay);
  }).unref();
}
```

In this example, we create a new instance of the Scanner class with the database configuration. We intialise the scanner to establish a baseline, then re-scan once per hour, logging the statistics each time.

## Index

<!-- no toc -->

- [Installiation](#installation)
- [API](#pg-scanner-api)
  - [init](#init)
  - [scan](#scan)

### Installation

To use the Scanner module in your project, follow these steps:

Install the Scanner module using npm or yarn:

```bash
npm install pg-scanner
# or
yarn add pg-scanner
```

Import the Scanner module into your JavaScript or TypeScript file:

```bash
const { Scanner } = require('pg-scanner');
# or
import { Scanner } from 'pg-scanner';
```

## API

### init()

```js
await scanner.init();
```

The init method is responsible for initialising the scanner wise baseline statistics. It will error if called repeatedly.

### scan()

```js
await scanner.scan();
```

The scan method is responsible for retrieving and augmenting database statistics.

### Contributing

Contributions to the Scanner module are welcome. If you find a bug, have a feature request, or want to improve the code, please open an issue or submit a pull request on GitHub.

### License

This project is licensed under the MIT License. Feel free to use and modify the code as needed.
