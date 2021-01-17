import * as fs from "fs";
import * as path from "path";
import { Readable } from "stream";

export class ImagePersister {
  private constructor(private directoryPath: string) {};

  public static usingDirectory = (directoryPath: string): ImagePersister => {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath);
    }

    return new ImagePersister(directoryPath); 
  };

 public persist = (fileName: string, image: Readable): Promise<void> => {
    return new Promise((resolve, reject) => {
      const destination = path.join(this.directoryPath, fileName);
      const stream = fs.createWriteStream(destination);
      image.pipe(stream);
      image.on("end", resolve);
      image.on("error", reject);
      stream.on("error", reject);
    });
  }
}
