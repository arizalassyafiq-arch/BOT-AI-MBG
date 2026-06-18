export interface HotNewsItem {
  title: string;
  source?: string;
  link?: string;
  publishedAt?: Date;
}

export interface HotNewsServiceOptions {
  rssUrls: string[];
  cacheMinutes: number;
  maxItems: number;
}

interface CachedHotNews {
  expiresAt: number;
  items: HotNewsItem[];
}

export class HotNewsService {
  private readonly cache = new Map<string, CachedHotNews>();

  constructor(private readonly options: HotNewsServiceOptions) {}

  async getHotItems(query?: string): Promise<HotNewsItem[]> {
    const cacheKey = this.normalizeQuery(query) || "top";
    const cachedItems = this.getCachedItems(cacheKey);
    if (cachedItems) {
      return cachedItems;
    }

    const urls = query ? [this.buildGoogleNewsSearchUrl(query)] : this.resolveRssUrls();
    const itemGroups = await Promise.allSettled(urls.map((url) => this.fetchRssItems(url)));
    const items = this.dedupeItems(
      itemGroups
        .filter((result): result is PromiseFulfilledResult<HotNewsItem[]> => result.status === "fulfilled")
        .flatMap((result) => result.value)
    ).slice(0, this.resolveMaxItems());

    this.cache.set(cacheKey, {
      expiresAt: Date.now() + this.resolveCacheMs(),
      items,
    });

    return items;
  }

  private async fetchRssItems(url: string): Promise<HotNewsItem[]> {
    const response = await fetch(url, {
      headers: {
        accept: "application/rss+xml, application/xml, text/xml",
        "user-agent": "whatsapp-partner-bot/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Hot news RSS request failed with HTTP ${response.status}`);
    }

    return this.parseRssItems(await response.text());
  }

  private parseRssItems(xml: string): HotNewsItem[] {
    const itemMatches = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];

    return itemMatches
      .map((itemXml) => this.parseRssItem(itemXml))
      .filter((item): item is HotNewsItem => Boolean(item?.title))
      .sort((first, second) => (second.publishedAt?.getTime() ?? 0) - (first.publishedAt?.getTime() ?? 0));
  }

  private parseRssItem(itemXml: string): HotNewsItem | undefined {
    const title = this.decodeXml(this.readTag(itemXml, "title"));
    if (!title) {
      return undefined;
    }

    const link = this.decodeXml(this.readTag(itemXml, "link"));
    const source = this.decodeXml(this.readTag(itemXml, "source"));
    const publishedAt = this.parseDate(this.decodeXml(this.readTag(itemXml, "pubDate")));

    return {
      title: this.cleanTitle(title, source),
      source: source || undefined,
      link: link || undefined,
      publishedAt,
    };
  }

  private readTag(xml: string, tagName: string): string {
    const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
    const match = xml.match(pattern);
    return match?.[1]?.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim() || "";
  }

  private cleanTitle(title: string, source?: string): string {
    const sourceSuffix = source ? new RegExp(`\\s+-\\s+${this.escapeRegExp(source)}$`, "i") : undefined;
    const titleWithoutSource = sourceSuffix ? title.replace(sourceSuffix, "") : title;

    return titleWithoutSource
      .replace(/\s+-\s+Google News$/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private decodeXml(value: string): string {
    return value
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .trim();
  }

  private parseDate(value: string): Date | undefined {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? new Date(timestamp) : undefined;
  }

  private dedupeItems(items: HotNewsItem[]): HotNewsItem[] {
    const seenTitles = new Set<string>();
    const uniqueItems: HotNewsItem[] = [];

    for (const item of items) {
      const normalizedTitle = item.title.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
      if (!normalizedTitle || seenTitles.has(normalizedTitle)) {
        continue;
      }

      seenTitles.add(normalizedTitle);
      uniqueItems.push(item);
    }

    return uniqueItems;
  }

  private getCachedItems(cacheKey: string): HotNewsItem[] | undefined {
    const cached = this.cache.get(cacheKey);
    if (!cached || cached.expiresAt <= Date.now()) {
      return undefined;
    }

    return cached.items;
  }

  private buildGoogleNewsSearchUrl(query: string): string {
    const normalizedQuery = `${this.normalizeQuery(query)} when:2d`.trim();
    return `https://news.google.com/rss/search?q=${encodeURIComponent(normalizedQuery)}&hl=id&gl=ID&ceid=ID:id`;
  }

  private normalizeQuery(query?: string): string {
    return (query || "")
      .toLowerCase()
      .replace(/\b(berita|viral|panas|trending|hari ini|terbaru|update|tentang|soal|mengenai|menurutmu|tanggapan|kamu|apa|yang|ada|lagi|dong)\b/gi, " ")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private resolveRssUrls(): string[] {
    return this.options.rssUrls.length > 0
      ? this.options.rssUrls
      : ["https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id"];
  }

  private resolveMaxItems(): number {
    if (!Number.isFinite(this.options.maxItems) || this.options.maxItems < 1) {
      return 5;
    }

    return Math.floor(this.options.maxItems);
  }

  private resolveCacheMs(): number {
    const cacheMinutes = Number.isFinite(this.options.cacheMinutes) && this.options.cacheMinutes > 0
      ? this.options.cacheMinutes
      : 30;

    return cacheMinutes * 60 * 1000;
  }
}
