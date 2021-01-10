import axios, { AxiosInstance } from "axios";
import { JSDOM } from "jsdom";
import * as path from "path";
import * as url from "url";

import { ImagePersister } from "./imagePersister";

const createOneIndexedRange = maximum => {
  return [...Array(maximum)].map((_, index) => index + 1);
}

class CooperHewittCollector {
  private BASE_URL = "https://collection.cooperhewitt.org";

  public constructor(
    private httpClient: AxiosInstance,
    private imagePersister: ImagePersister,
  ) {}

  public collectImagesOnPage = async (numbered: number): Promise<void> => {
    const imageURLs = this.getImageURLsOnPage(
      await this.fetchPageNumber(numbered)
    );

    const promises = imageURLs.map(async imageURL => {
      const { pathname } = url.parse(imageURL);
      const response = await this.httpClient.get(imageURL, { responseType: "stream" });
      return this.imagePersister.persist(path.basename(pathname), response.data);
    });

    await Promise.all(promises);
  }
  
  private getImageURLsOnPage = (source: string): string[] => {
    const nodes = new JSDOM(source)
      .window
      .document
      .querySelectorAll(".object-image img")

    return Array.from(nodes)
      .filter(node => {
        return !node.classList.contains("image-not-available");
      })
      .map(node => {
        return node.getAttribute("src");
      })
      .map(imageURL => {
        return imageURL.replace("_n.jpg", "_b.jpg");
      });
  }

  private fetchPageNumber = async (value: number): Promise<string> => {
    console.log(`fetching page number ${value}...`);
    const response = await this.httpClient.get(`${this.BASE_URL}/types/35251739/page${value}`);
    return response.data;
  }
}

type Action = () => void;

const doWithDelay = async (action: Action, delay: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        return resolve(await action());
      } catch (error) {
        return reject(error);
      }
    }, delay);
  });
}

const imagePersister = ImagePersister.usingDirectory("data");
const collector = new CooperHewittCollector(axios, imagePersister);
collector.collectImagesOnPage(1).catch(console.error);
