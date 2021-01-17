import { EventEmitter } from "events";
import { Logger } from "pino";

type Job = string;
type Task<R> = (job: Job) => Promise<R>;

class Worker {
    public constructor(private readonly logger: Logger) {}

    public process = async <R>(
        queue: Job[],
        task: Task<R>,
    ): Promise<R[]> => {
        const results: R[] = [];
        let job = queue.pop();

        while (job) {
            try {
                results.push(await task(job));
                this.logger.child({ job }).debug("completed job");
            } catch (error) {
                this.logger
                    .child({ job, error })
                    .error("failed to handle job");
            }

            job = queue.pop();
        }

        return results;
    };
}

export class BatchProcessor {
    public constructor(
        private readonly workers: Worker[],
        private readonly logger: Logger,
    ) {}

    public static withWorkers = (
        count: number,
        logger: Logger,
    ): BatchProcessor => {
        const workers = [...Array(count)].map(() => {
            return new Worker(logger);
        });

        return new BatchProcessor(workers, logger);
    };

    public process = async <R>(
        jobs: Job[],
        task: Task<R>,
    ): Promise<R[]> => {
        const results = await Promise.all(
            this.workers.map((worker) => {
                return worker.process(jobs, task);
            }),
        );

        this.logger.debug("completed all jobs");
        return results.reduce((acc, next) => acc.concat(next));
    };
}
