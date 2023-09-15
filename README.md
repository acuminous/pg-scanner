# PG-Scanner

PG-Scanner is a library to connect to a PostgreSQL database and perform scanning operations on tables to return statistics.

## TL;DR

```js
const config = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'mydb'
};

const { Scanner } = new Scanner(config);

scanner.connect()
  .then(() => scanner.init())
  .then(() => scanner.scan())
  .then((stats) => {
    console.log(stats);
    scanner.disconnect();
  })
  .catch((error) => {
    console.error(error);
    scanner.disconnect();
  });
```

In this example, we create a new instance of the Scanner class with the database configuration. We then connect to the database, initialise the scanner, and perform a scan on the tables. Finally, we log the table statistics and disconnect from the database. If any errors occur during the process, we log the error and disconnect from the database.


## Index

<!-- no toc -->
- [PG-Scanner API](#pg-scanner-api)
  - [init](#init)
  - [scan](#scan)
  - [connect](#connect)
  - [disconnect](#disconnect)

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

## PG-Scanner API

### init()

```js
const scanner = await scanner.init();
```

The init method is responsible for initializing the scanner. It checks if the scanner has already been initialized, then calls the scan method to retrieve database table statistics. After that, it sets the initialised flag to true and returns the scanner instance.

### connect()

```js
const scanner = new Scanner(config);
await scanner.connect();
```

The connect method is responsible for establishing a connection to a PostgreSQL database using the provided configuration. It creates a new instance of the Client class with the given configuration and attempts to connect to the database. If an error occurs during the connection process, a ConnectionError is thrown with a detailed error message. Finally, the method returns the current instance of the Scanner class.

### scan()
```js
await scanner.scan();
```

The scan method is responsible for retrieving database table statistics, augmenting the statistics with additional information, and updating the previous statistics. It returns the augmented statistics.

### disconnect()

```js
await scanner.disconnect();
```

The disconnect method is responsible for disconnecting the client from the database.

### Contributing
Contributions to the Scanner module are welcome. If you find a bug, have a feature request, or want to improve the code, please open an issue or submit a pull request on GitHub.

### License
This project is licensed under the MIT License. Feel free to use and modify the code as needed.
