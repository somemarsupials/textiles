import axios, { AxiosInstance } from "axios";
import { parse } from "node-html-parser";
import * as path from "path";
import * as url from "url";
import { Readable } from "stream";
import { Logger } from "pino";

import { BatchProcessor } from "./batch";
import { FileSystemPersister } from "./persist";

export class CooperHewittCollector {
    private BASE_URL = "https://collection.cooperhewitt.org";

    public constructor(
        private readonly httpClient: AxiosInstance,
        private readonly persister: FileSystemPersister,
        private readonly batchProcessor: BatchProcessor,
        private readonly logger: Logger,
    ) {}

    public run = async (maxPageNumber: number): Promise<void> => {
        const imageURLs = await this.fetchImageURLs(maxPageNumber);
        return this.fetchImages(imageURLs);
    };

    private fetchImageURLs = async (upTo: number): Promise<string[]> => {
        const results = await this.batchProcessor.process(
            this.buildSearchResultPageURLsUpTo(upTo),
            this.scanResultsPage,
        );

        return results.reduce((a, b) => {
            return a.concat(b);
        }, []);
    };

    private buildSearchResultPageURLsUpTo = (upTo: number): string[] => {
        return [...Array(upTo)].map((_, index) => {
            return this.buildSearchResultPageURL(index + 1);
        });
    };

    private buildSearchResultPageURL = (numbered: number): string => {
        return `${this.BASE_URL}/types/35251739/page${numbered}`;
    };

    private scanResultsPage = async (at: string): Promise<string[]> => {
        this.logger
            .child({ url: at })
            .info("scanning page for image URLs");

        const response = await this.httpClient.get(at);
        return this.getImageURLsOnPage(response.data);
    };

    private getImageURLsOnPage = (source: string): string[] => {
        return parse(source)
            .querySelectorAll(".object-image img")
            .filter((node) => {
                return !node.classNames.includes("image-not-available");
            })
            .map((node) => {
                return node.getAttribute("src");
            })
            .filter((imageURL): imageURL is string => {
                return (
                    typeof imageURL === "string" && imageURL.length > 0
                );
            })
            .map((imageURL) => {
                return imageURL.replace("_n.jpg", "_b.jpg");
            });
    };

    private fetchImages = async (urls: string[]): Promise<void> => {
        await this.batchProcessor.process(urls, async (imageURL) => {
            return this.persistImage(
                imageURL,
                await this.fetchImageAsStream(imageURL),
            );
        });
    };

    private fetchImageAsStream = async (
        imageURL: string,
    ): Promise<Readable> => {
        this.logger.child({ url: imageURL }).debug("fetching image");

        const response = await this.httpClient.get(imageURL, {
            responseType: "stream",
        });

        return response.data;
    };

    private persistImage = async (
        imageURL: string,
        stream: Readable,
    ): Promise<void> => {
        const { pathname } = url.parse(imageURL);

        if (pathname === null) {
            this.logger
                .child({ imageURL })
                .error("cannot parse image URL");

            return;
        }

        return this.persister.persist(path.basename(pathname), stream);
    };
}
