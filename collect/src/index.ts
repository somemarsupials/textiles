import axios from "axios";
import pino from "pino";

import { BatchProcessor } from "./batch";
import { CooperHewittCollector } from "./cooperHewitt";
import { FileSystemPersister } from "./persist";

const logger = pino({ level: "debug" });
const persister = FileSystemPersister.usingDirectory("data", logger);
const batchProcessor = BatchProcessor.withWorkers(10, logger);

const collector = new CooperHewittCollector(
  axios,
  persister,
  batchProcessor,
  logger
);

collector.run(5).catch(error => {
  console.error(error)
});
