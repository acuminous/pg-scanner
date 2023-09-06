class ScannerError extends Error {
  #code

  constructor(code, message, options) {
    super(message, options);
    this.#code = code;
  }

  get code() {
    return this.#code;
  }
}

class InitialisationError extends ScannerError {
  constructor(message, options) {
    super('ERR_PG_SCANNER_INITIALISATION_ERROR', message, options)
  }
}

class ConnectionError extends ScannerError {
  constructor(message, options) {
    super('ERR_PG_SCANNER_CONNECTION_ERROR', message, options);
  }
}

module.exports = {
  InitialisationError,
  ConnectionError,
}