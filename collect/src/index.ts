import axios, { AxiosInstance } from "axios";
import { parse } from "node-html-parser";
import * as path from "path";
import * as url from "url";
import { Readable } from "stream";

import { BatchProcessor } from "./batch";
import { ImagePersister } from "./persister";

const createOneIndexedRange = maximum => {
  return [...Array(maximum)].map((_, index) => index + 1);
}

class CooperHewittCollector {
  private BASE_URL = "https://collection.cooperhewitt.org";

  public constructor(
    private readonly httpClient: AxiosInstance,
    private readonly persister: ImagePersister,
    private readonly batchProcessor: BatchProcessor
  ) {}

  public run = async (maxPageNumber: number): Promise<void> => {
    const imageURLs = await this.prepareImageURLs(maxPageNumber);
    return this.fetchImages(imageURLs);
  }

  private prepareImageURLs = async (upTo: number): Promise<string[]> => {
    const pageURLs = [...Array(upTo)].map((_, index) => {
      return this.buildSearchResultPageURL(index + 1);
    });

    const results = await this.batchProcessor.process(
      pageURLs,
      this.scanResultsPage
    )

    return results.reduce((acc, next) => acc.concat(next));
  }

  private buildSearchResultPageURL = (numbered: number): string => {
    return `${this.BASE_URL}/types/35251739/page${numbered}`;
  }

  private scanResultsPage = async (at: string): Promise<string[]> => {
    console.log(`scanning page ${at}`);

    return this.getImageURLsOnPage(
      (await this.httpClient.get(at)).data
    );
  }

  private getImageURLsOnPage = (source: string): string[] => {
    return parse(source)
      .querySelectorAll(".object-image img")
      .filter(node => {
        return !node.classNames.includes("image-not-available");
      })
      .map(node => {
        return node.getAttribute("src");
      })
      .filter(imageURL => {
        return typeof imageURL === "string" && imageURL.length > 0;
      })
      .map(imageURL => {
        return imageURL.replace("_n.jpg", "_b.jpg");
      });
  }

  private fetchImages = async (urls: string[]): Promise<void> => {
    await this.batchProcessor.process(urls, async imageURL => {
        return this.persistImage(
          imageURL,
          await this.fetchImage(imageURL)
        );
    });
  };

  private fetchImage = async (imageURL: string): Promise<Readable> => {
    console.log(`fetching image ${imageURL}`);

    const response = await this.httpClient.get(imageURL, {
      responseType: "stream"
    });

    return response.data;
  }

  private persistImage = async (imageURL: string, stream: Readable): Promise<void> => {
    return this.persister.persist(
      path.basename(url.parse(imageURL).pathname),
      stream
    );
  }
}

const persister = ImagePersister.usingDirectory("data");
const batchProcessor = BatchProcessor.withWorkers(10);

const collector = new CooperHewittCollector(
  axios,
  persister,
  batchProcessor
);

collector.run(5).catch(error => console.error(error));
