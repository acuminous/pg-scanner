export class Scanner {
  constructor(options: ScannerOptions);
  init(): Promise<void>;
  scan(): Promise<Stats>;
}

export type ScannerOptions = {
  config: any;
  filter: FilterFunction
}

export type FilterFunction = (params: FilterParams) => Boolean;

export type FilterParams = {
  schema: String;
  table: String;
}

export type Stats = {
  tables: TableStats[];
}

export type TableStats = {
  sequentialScans: BigInt;
  rowsScanned: BigInt;
  sequentialScansDelta: BigInt;
  rowsScannedDelta: BigInt;
}
