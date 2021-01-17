import * as fs from "fs";
import * as path from "path";
import { Logger } from "pino";
import { Readable } from "stream";

export class FileSystemPersister {
    private constructor(
        private directoryPath: string,
        private logger: Logger,
    ) {}

    public static usingDirectory = (
        directoryPath: string,
        logger: Logger,
    ): FileSystemPersister => {
        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath);
        }

        return new FileSystemPersister(directoryPath, logger);
    };

    public persist = (
        fileName: string,
        image: Readable,
    ): Promise<void> => {
        return new Promise((resolve, reject) => {
            const destination = path.join(this.directoryPath, fileName);
            const stream = fs.createWriteStream(destination);
            image.pipe(stream);

            image.on("end", () => {
                this.logger
                    .child({ fileName })
                    .debug("successfully written image data");

                resolve();
            });

            image.on("error", (error) => {
                this.logger
                    .child({ fileName, error })
                    .error("encountered error in download stream");

                reject(error);
            });

            stream.on("error", (error) => {
                this.logger
                    .child({ fileName, error })
                    .error("failed to write image data");
            });
        });
    };
}
