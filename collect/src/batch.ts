import { EventEmitter } from "events";

type Job = string;
type Task<R> = (job: Job) => Promise<R>;

class Worker {
  public process = async <R>(queue: Job[], task: Task<R>): Promise<R[]> => {
    const results: R[] = []; 

    while (queue.length > 0) {
      const job = queue.pop();
      results.push(await task(job));
    }

    return results;
  }
}

export class BatchProcessor {
  public constructor(
    private readonly workers: Worker[]
  ) {}

  public static withWorkers = (
    count: number,
  ): BatchProcessor => {
    const workers = [...Array(count)].map(() => {
      return new Worker();
    });

    return new BatchProcessor(workers);
  }

  public process = async <R>(
    jobs: Job[],
    task: Task<R>
  ): Promise<R[]> => {
    const results = await Promise.all(
      this.workers.map(worker => {
        return worker.process(jobs, task)
      })
    );

    return results.reduce((acc, next) => acc.concat(next));
  };
}
