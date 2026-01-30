import { parseRssFeed } from 'feedsmith'
import Store from "electron-store";
import { StoreSchema } from "./lib/utils";

const store = new Store<StoreSchema>();

async function fetchFeedXml(feedUrl: string): Promise<string> {
    const response = await fetch(feedUrl, {
        headers: {
            Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7",
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed (${response.status})`);
    }

    return response.text();
}

export interface NewsItem {
    title: string;
    link: string;
    description?: string;
    pubDate?: Date;
    author?: string;
    source: string;
}

/**
 * Fetches RSS feeds from the store and returns the 5 newest news items
 * @returns Array of the 10 most recent news items across all feeds
 */
export async function getLatestNews(): Promise<NewsItem[]> {
    const rssFeeds = store.get("news.providers.rss", ["https://news.ycombinator.com/rss"]);

    if (!rssFeeds || rssFeeds.length === 0) {
        return [];
    }

    // Fetch all feeds in parallel
    const feedPromises = rssFeeds.map(async (feedUrl) => {
        try {
            const feedXml = await fetchFeedXml(feedUrl);
            const feed = parseRssFeed(feedXml);

            // Map feed items to our NewsItem format
            return feed.items?.map((item): NewsItem => ({
                title: item.title || "Untitled",
                link: item.link || "",
                description: item.description || "",
                pubDate: item.pubDate ? new Date(item.pubDate) : undefined,
                author: item.authors?.[0] || "",
                source: feed.title || "",
            })) || [];
        } catch (error) {
            console.warn(`Failed to load RSS feed: ${feedUrl}`, error);
            return [];
        }
    });

    // Wait for all feeds to be fetched
    const allFeedResults = await Promise.all(feedPromises);

    // Flatten all items from all feeds
    const allItems = allFeedResults.flat();

    // Sort by publication date (newest first)
    const sortedItems = allItems.sort((a, b) => {
        const dateA = a.pubDate?.getTime() || 0;
        const dateB = b.pubDate?.getTime() || 0;
        return dateB - dateA;
    });

    // Return the 5 newest items
    return sortedItems.slice(0, 10);
}
