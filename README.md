# PG-Scanner

PG-Scanner is a library which reports statistics about PostgreSQL databases.

## TL;DR

```js
const { Scanner } = require("pg-scanner");

const config = {
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "password",
  database: "mydb",
};

const scanner = new Scanner({ config });

(async () => {
  await scanner.init();
  scheduleScan(60 * 60 * 1000);
})();

function scheduleScan(delay) {
  setTimeout(async () => {
    const stats = await scanner.scan();
    dump(stats);
    scheduleScan(delay);
  }, delay).unref();
}

function dump(stats) {
  const serializer = (_, value) => typeof value === "bigint" ? value.toString() : value;
  const text = JSON.stringify(stats, serializer);
  console.log(text);
}
```

In this example, we create a new instance of the Scanner class with the database configuration. We intialise the scanner to establish a baseline, then re-scan once per hour, logging the statistics each time.

The custom serializer is required because JavaScripts maximum safe integer is less than the maximum value of a PostgreSQL integer, and the numerical stats have a type of BigInt.

We call `unref` to ensure the scheduled scans to not prevent your application from shutting down if the event loop is otherwise inactive, but if you are running the above script in a standalone process you may wish to remove this call.

## Index

<!-- no toc -->

- [Installation](#installation)
- [API](#api)
  - [Constructor](#scanneroptions--scanneroptions)
  - [init](#init--promisevoid)
  - [scan](#scan--promisestats)
  - [Stats](#stats)
- [Contributing](#contributing)
- [License](#license)


### Installation

To use the Scanner module in your project, follow these steps:

Install the Scanner module using npm or yarn:

```bash
npm install pg-scanner
# or
yarn add pg-scanner
```

Import the Scanner module into your JavaScript or TypeScript file:

```js
const { Scanner } = require('pg-scanner');
// or
import { Scanner } from 'pg-scanner';
```

## API

### Scanner(options? : ScannerOptions)

| Name    | Required | Notes                                                                                                                                                                                                                                  |
| ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| config  | No       | A configuration object which is passed directly to [node-pg](https://www.npmjs.com/package/pg). Alternatively, you can use [environment variables](https://node-postgres.com/features/connecting#environment-variables) if you prefer. |
| filter  | No       | A function for filtering out unwanted tables. It will be called with an object with a table and schema property and should return truthy if the table is to be included in the statistics                                              |

### init() : Promise&lt;void&gt;

```js
await scanner.init();
```

The init method is responsible for initialising the scanner wise baseline statistics. It will error if called repeatedly.

### scan() : Promise&lt;Stats&gt;

```js
await scanner.scan();
```

The scan method is responsible for retrieving and augmenting database statistics.

### Stats

The stats returned by the [scan](#scan) is an array of objects with the following properties

| Name                 | Notes                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| schema               | The schema to which the stats relate                                  |
| table                | The table to which the stats relate                                   |
| sequentialScans      | The total number of sequential scans performed on the table           |
| rowsScanned          | The total number of rows returned by the sequential scans             |
| sequentialScansDelta | The change in sequential scans since the last check                   |
| rowsScannedDelta     | The change in rows scanned since the last check                       |

### Contributing

Contributions to the Scanner module are welcome. If you find a bug, have a feature request, or want to improve the code, please open an issue or submit a pull request on GitHub.

### License

This project is licensed under the MIT License. Feel free to use and modify the code as needed.
