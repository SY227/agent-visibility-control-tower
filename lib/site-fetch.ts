import { load } from "cheerio";
import { XMLParser } from "fast-xml-parser";

import type { EvidenceReceipt, SiteFacts, SitePage, SiteScanResult } from "@/lib/types";
import { dedupe, normalizeWhitespace, safeUrlLabel, truncate } from "@/lib/utils";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 12000;
const MAX_PAGES = 6;
const MAX_SITEMAP_URLS = 28;
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

const PAGE_PATTERNS: Array<{ type: string; regex: RegExp; score: number }> = [
  { type: "pricing", regex: /\/(pricing|plans|cost)(\/|$)/i, score: 98 },
  { type: "product", regex: /\/(enterprise|plus)(\/|$)/i, score: 99 },
  { type: "product", regex: /\/(product|products|platform|features|solutions)(\/|$)/i, score: 96 },
  { type: "customers", regex: /\/(customers|case-studies|testimonials|stories)(\/|$)/i, score: 92 },
  { type: "docs", regex: /\/(docs|documentation|developers|api|reference)(\/|$)/i, score: 91 },
  { type: "about", regex: /\/(about|company|mission|story|team)(\/|$)/i, score: 88 },
  { type: "security", regex: /\/(security|trust|compliance)(\/|$)/i, score: 86 },
  { type: "use-cases", regex: /\/(use-cases?|industries|workflow|solutions)(\/|$)/i, score: 85 },
  { type: "blog", regex: /\/(blog|resources|learn|guides)(\/|$)/i, score: 70 },
];

const NOISY_PATHS = /(\/login|\/signin|\/signup|\/careers|\/legal|\/privacy|\/terms|\/support|\/contact|\/checkout|\/cart)(\/|$)/i;
const SKIP_EXTENSIONS = /\.(pdf|jpg|jpeg|png|webp|gif|svg|zip|mp4|mp3|csv|xml|json)$/i;
const NOISY_TEXT_PATTERNS = [
  /productsback/i,
  /backget/i,
  /why shopifyback/i,
  /website builderthemesdomains/i,
  /customer accountssidekick/i,
  /social & marketplaces/i,
  /there'?s no better place for you to build/i,
  /cookie/i,
  /accept all/i,
  /skip to content/i,
];

function buildCandidateUrls(input: string) {
  const raw = input.trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(withProtocol);
  const host = url.hostname.replace(/^www\./i, "");
  return dedupe([
    `https://${host}`,
    `https://www.${host}`,
    `http://${host}`,
    `http://www.${host}`,
  ]);
}

function normalizeUrl(url: string) {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.search = "";
  parsed.hostname = parsed.hostname.replace(/^www\./i, "");
  parsed.pathname = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/+$/, "") || "/";
  return `https://${parsed.hostname}${parsed.pathname}`;
}

function isSameDomain(url: string, hostname: string) {
  const candidate = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  const base = hostname.replace(/^www\./i, "").toLowerCase();
  return candidate === base || candidate.endsWith(`.${base}`);
}

function inferPageType(url: string) {
  try {
    const pathname = new URL(url).pathname || "/";
    if (pathname === "/") return "homepage";
    for (const pattern of PAGE_PATTERNS) {
      if (pattern.regex.test(pathname)) return pattern.type;
    }
    return "page";
  } catch {
    return "page";
  }
}

function scoreCandidate(url: string, label = "") {
  const pathname = new URL(url).pathname;
  if (pathname === "/") return 120;
  let score = 40;
  for (const pattern of PAGE_PATTERNS) {
    if (pattern.regex.test(pathname) || pattern.regex.test(`/${label}`)) score = Math.max(score, pattern.score);
  }
  if (/\b(20\d{2}|19\d{2})\b/.test(pathname) || /\/(blog|learn|guide|guides|news|retail)\//i.test(pathname)) score -= 18;
  if (/enterprise|plus|b2b|wholesale/i.test(pathname)) score += 10;
  if (pathname.split("/").filter(Boolean).length > 3) score -= 8;
  return score;
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "user-agent": USER_AGENT,
      },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithRetry(url: string) {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetchText(url);
      if (response.ok || ![408, 425, 429, 500, 502, 503, 504].includes(response.status)) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown fetch error");
    }
    await new Promise((resolve) => setTimeout(resolve, 250 + attempt * 180));
  }
  throw lastError || new Error("Request failed");
}

function cleanTextFragment(value: string) {
  const normalized = normalizeWhitespace(value || "")
    .replace(/\b(Back|Menu|Navigation)\b/gi, " ")
    .replace(/try [a-z0-9 ]*free/gi, " ")
    .replace(/get started(?: fast)?/gi, " ")
    .replace(/build or grow your business(?: fast)?(?: with ai)?/gi, " ")
    .replace(/\s*([,:;])\s*/g, "$1 ")
    .replace(/\s*([.!?])\s*/g, "$1 ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s.,;:!?-]+/, "")
    .trim();

  return normalized;
}

function isNoisyTextFragment(value: string) {
  const normalized = cleanTextFragment(value);
  if (!normalized) return true;
  if (NOISY_TEXT_PATTERNS.some((pattern) => pattern.test(normalized))) return true;

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const capitalized = (normalized.match(/[A-Z][a-z]+/g) || []).length;
  const navHints = (normalized.match(/Products|Pricing|Themes|Domains|Docs|Developers|Marketplaces|Campaigns/gi) || []).length;

  return wordCount > 10 && capitalized >= 8 && navHints >= 4 && !/[.!?]/.test(normalized);
}

function keepTextFragment(value: string, minLength = 24) {
  const cleaned = cleanTextFragment(value);
  if (!cleaned || cleaned.length < minLength) return false;
  if (isNoisyTextFragment(cleaned)) return false;

  const words = cleaned.split(/\s+/).filter(Boolean);
  const uniqueRatio = new Set(words.map((word) => word.toLowerCase())).size / Math.max(words.length, 1);

  return uniqueRatio > 0.45;
}

function extractSignalSentences(text: string, regex: RegExp, limit = 3) {
  const sentences = normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+|\s[•·]\s|\n+/)
    .map((item) => cleanTextFragment(item))
    .filter((item) => keepTextFragment(item, 20));

  return dedupe(sentences.filter((item) => regex.test(item))).slice(0, limit).map((item) => truncate(item, 220));
}


function extractPage(url: string, html: string, hostname: string): SitePage {
  const $ = load(html);
  $("script:not([type='application/ld+json']), style, noscript, svg, iframe, form, nav, header, footer, aside, menu, [role='navigation']").remove();
  $("[aria-label*='navigation' i], [class*='nav' i], [id*='nav' i], [class*='menu' i], [id*='menu' i], [class*='cookie' i], [id*='cookie' i], [class*='banner' i][class*='cookie' i]").remove();

  const title = cleanTextFragment($("title").first().text());
  const metaDescription = cleanTextFragment(
    $("meta[name='description']").attr("content") ||
      $("meta[property='og:description']").attr("content") ||
      "",
  );
  const h1 = cleanTextFragment($("h1").first().text());
  const headings = dedupe(
    [h1]
      .concat(
        $("main h2, main h3, article h2, article h3, section h2, section h3, h2, h3")
          .toArray()
          .map((element) => cleanTextFragment($(element).text())),
      )
      .filter((item) => keepTextFragment(item, 12)),
  ).slice(0, 12);

  const paragraphs = $("main p, article p, section p, main li, article li, section li")
    .toArray()
    .map((element) => cleanTextFragment($(element).text()))
    .filter((item) => keepTextFragment(item, 36));

  const snippetSource = /try .*free|get started|build or grow your business/i.test(metaDescription)
    ? paragraphs[0] || h1 || title || metaDescription
    : metaDescription || paragraphs[0] || h1 || title;
  const snippet = truncate(snippetSource, 220);
  const bodyText = truncate(dedupe(paragraphs).join(" "), 4200);
  const combined = [title, metaDescription, h1, headings.join(". "), bodyText].filter(Boolean).join(". ");

  const internalLinks = dedupe(
    $("a[href]")
      .toArray()
      .map((element) => {
        const href = $(element).attr("href");
        const label = cleanTextFragment($(element).text());
        if (!href || !label || isNoisyTextFragment(label)) return null;
        try {
          const absolute = new URL(href, url).toString();
          if (!isSameDomain(absolute, hostname)) return null;
          if (NOISY_PATHS.test(new URL(absolute).pathname) || SKIP_EXTENSIONS.test(absolute)) return null;
          return JSON.stringify({ label: truncate(label, 80), url: normalizeUrl(absolute) });
        } catch {
          return null;
        }
      })
      .filter(Boolean) as string[],
  ).map((value) => JSON.parse(value) as { label: string; url: string });

  const schemaTypes = dedupe(
    $("script[type='application/ld+json']")
      .toArray()
      .flatMap((element) => {
        const raw = $(element).html();
        if (!raw) return [] as string[];
        try {
          const parsed = JSON.parse(raw) as unknown;
          const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
          const types: string[] = [];
          while (queue.length) {
            const current = queue.shift();
            if (!current || typeof current !== "object") continue;
            const record = current as Record<string, unknown>;
            const type = record["@type"];
            if (typeof type === "string") types.push(type);
            if (Array.isArray(type)) {
              for (const item of type) if (typeof item === "string") types.push(item);
            }
            for (const value of Object.values(record)) {
              if (value && typeof value === "object") {
                if (Array.isArray(value)) queue.push(...value);
                else queue.push(value);
              }
            }
          }
          return types;
        } catch {
          return [];
        }
      }),
  ).slice(0, 10);

  return {
    url,
    normalizedUrl: normalizeUrl(url),
    pageType: inferPageType(url),
    title,
    metaDescription,
    h1,
    headings,
    bodyText,
    snippet,
    schemaTypes,
    internalLinks,
    pricingSignals: extractSignalSentences(combined, /\$|pricing|plan|enterprise|quote|monthly|annual|contact sales/i),
    proofSignals: extractSignalSentences(combined, /trusted by|customer|customers|case study|testimonial|roi|results|millions|billions|logos/i),
    trustSignals: extractSignalSentences(combined, /security|compliance|soc 2|soc2|gdpr|privacy|trust|audit/i),
    useCaseSignals: extractSignalSentences(combined, /for teams|for developers|for finance|for sales|for marketing|for operations|workflow|use case|industry|entrepreneurs|enterprise|b2b|dtc|brands|merchants|retail/i),
    actionSignals: extractSignalSentences(combined, /book a demo|get started|contact sales|start free trial|request a demo|talk to sales|buy now|plans & pricing|pricing/i),
    citationSignals: extractSignalSentences(combined, /according to|certified|documented|reference|faq|guide|study|report|integration/i),
  };
}

function parseSitemapUrls(xmlText: string) {
  try {
    const parsed = parser.parse(xmlText);
    const urls: string[] = [];
    const fromUrlset = parsed?.urlset?.url;
    if (fromUrlset) {
      const entries = Array.isArray(fromUrlset) ? fromUrlset : [fromUrlset];
      for (const entry of entries) if (entry?.loc) urls.push(String(entry.loc));
    }
    const fromIndex = parsed?.sitemapindex?.sitemap;
    if (fromIndex) {
      const entries = Array.isArray(fromIndex) ? fromIndex : [fromIndex];
      for (const entry of entries) if (entry?.loc) urls.push(String(entry.loc));
    }
    return dedupe(urls).slice(0, MAX_SITEMAP_URLS);
  } catch {
    return [] as string[];
  }
}

async function resolveHomepage(input: string) {
  const candidates = buildCandidateUrls(input);
  const notes: string[] = [];

  for (const candidate of candidates) {
    try {
      const response = await fetchWithRetry(candidate);
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok) {
        notes.push(`Could not fetch ${candidate}: HTTP ${response.status}.`);
        continue;
      }
      if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
        notes.push(`Skipped ${candidate}: non-HTML response.`);
        continue;
      }
      const html = await response.text();
      if (!normalizeWhitespace(html)) {
        notes.push(`Could not use ${candidate}: empty HTML.`);
        continue;
      }
      return {
        finalUrl: response.url,
        html,
        notes,
      };
    } catch (error) {
      notes.push(`Could not fetch ${candidate}: ${error instanceof Error ? error.message : "Unknown error"}.`);
    }
  }

  return { finalUrl: null, html: null, notes };
}

function buildFacts(pages: SitePage[], pagesDiscovered: number, robotsStatus: SiteFacts["robotsStatus"], sitemapStatus: SiteFacts["sitemapStatus"]): SiteFacts {
  return {
    pagesAnalyzed: pages.length,
    pagesDiscovered,
    pageTypes: dedupe(pages.map((page) => page.pageType)),
    pagesWithSchema: pages.filter((page) => page.schemaTypes.length > 0).length,
    pagesWithPricing: pages.filter((page) => page.pricingSignals.length > 0 || page.pageType === "pricing").length,
    pagesWithProof: pages.filter((page) => page.proofSignals.length > 0).length,
    pagesWithUseCases: pages.filter((page) => page.useCaseSignals.length > 0 || page.pageType === "use-cases").length,
    pagesWithActions: pages.filter((page) => page.actionSignals.length > 0 || page.pageType === "pricing").length,
    pagesWithThinContent: pages.filter((page) => page.bodyText.split(/\s+/).filter(Boolean).length < 90).length,
    robotsStatus,
    sitemapStatus,
  };
}

function buildEvidenceReceipts(pages: SitePage[]): EvidenceReceipt[] {
  const receipts: EvidenceReceipt[] = [];
  const seen = new Set<string>();

  for (const page of pages) {
    const pushReceipt = (signal: string, whyItMatters: string, snippet: string) => {
      if (receipts.length >= 8) return;
      const cleanedSnippet = truncate(cleanTextFragment(snippet || page.snippet), 220);
      if (!cleanedSnippet || isNoisyTextFragment(cleanedSnippet)) return;
      const key = `${page.url}::${cleanedSnippet.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      receipts.push({
        sourceName: page.title || safeUrlLabel(page.url),
        sourceUrl: page.url,
        signal,
        whyItMatters,
        snippet: cleanedSnippet,
      });
    };

    if (page.pricingSignals[0]) {
      pushReceipt("Pricing or commercial language is visible.", "Agents can more easily infer buying motion, packaging, and commercial intent.", page.pricingSignals[0]);
    }
    if (page.proofSignals[0]) {
      pushReceipt("Proof or customer credibility signal is present.", "Citation-friendly proof improves whether an answer engine can support a recommendation confidently.", page.proofSignals[0]);
    }
    if (page.useCaseSignals[0]) {
      pushReceipt("Use-case language appears in rendered copy.", "This helps machines map the company to a buyer problem, workflow, or role-based query.", page.useCaseSignals[0]);
    }
    if (page.schemaTypes[0]) {
      pushReceipt(`Structured data detected: ${page.schemaTypes.join(", ")}.`, "Structured data can reduce ambiguity when agents parse page intent and business facts.", page.snippet);
    }
    if (page.actionSignals[0]) {
      pushReceipt("Action path is visible in public copy.", "AI agents need a clear next step, not just persuasion, to move from understanding to action.", page.actionSignals[0]);
    }
  }

  return receipts.slice(0, 8);
}

export async function scanSite(inputUrl: string): Promise<SiteScanResult> {
  const resolved = await resolveHomepage(inputUrl);
  const limitations = [...resolved.notes];

  if (!resolved.finalUrl || !resolved.html) {
    return {
      inputUrl,
      normalizedUrl: /^https?:\/\//i.test(inputUrl) ? inputUrl : `https://${inputUrl}`,
      pages: [],
      facts: buildFacts([], 0, "unknown", "unknown"),
      evidenceReceipts: [],
      crawlNotes: resolved.notes,
      limitations: [
        "The site could not be fetched from this environment with a lightweight public-page crawl.",
        ...resolved.notes.slice(0, 4),
      ],
    };
  }

  const homepageUrl = normalizeUrl(resolved.finalUrl);
  const homepageHost = new URL(homepageUrl).hostname;
  const homepage = extractPage(homepageUrl, resolved.html, homepageHost);

  let robotsStatus: SiteFacts["robotsStatus"] = "unknown";
  let sitemapStatus: SiteFacts["sitemapStatus"] = "unknown";
  const discovered = new Map<string, { url: string; score: number }>;

  const addCandidate = (url: string, label = "") => {
    try {
      const normalized = normalizeUrl(url);
      const pathname = new URL(normalized).pathname;
      if (!isSameDomain(normalized, homepageHost)) return;
      if (pathname === "/" || NOISY_PATHS.test(pathname) || SKIP_EXTENSIONS.test(pathname)) return;
      const score = scoreCandidate(normalized, label);
      const existing = discovered.get(normalized);
      if (!existing || score > existing.score) discovered.set(normalized, { url: normalized, score });
    } catch {
      // ignore candidate
    }
  };

  for (const link of homepage.internalLinks) addCandidate(link.url, link.label);
  for (const guess of ["/pricing", "/enterprise", "/plus/solutions/b2b-ecommerce", "/product", "/solutions", "/customers", "/docs", "/about", "/security"]) {
    addCandidate(new URL(guess, homepageUrl).toString(), guess);
  }

  try {
    const robotsResponse = await fetchWithRetry(`${new URL(homepageUrl).origin}/robots.txt`);
    robotsStatus = robotsResponse.ok ? "found" : robotsResponse.status === 404 ? "not_found" : "blocked";
  } catch {
    robotsStatus = "blocked";
  }

  try {
    const sitemapResponse = await fetchWithRetry(`${new URL(homepageUrl).origin}/sitemap.xml`);
    if (sitemapResponse.ok) {
      sitemapStatus = "found";
      const sitemapText = await sitemapResponse.text();
      for (const url of parseSitemapUrls(sitemapText)) addCandidate(url, inferPageType(url));
    } else {
      sitemapStatus = sitemapResponse.status === 404 ? "not_found" : "blocked";
    }
  } catch {
    sitemapStatus = "blocked";
  }

  const pages: SitePage[] = [homepage];
  const candidateUrls = [...discovered.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PAGES - 1)
    .map((item) => item.url);

  for (const url of candidateUrls) {
    try {
      const response = await fetchWithRetry(url);
      if (!response.ok) {
        limitations.push(`Skipped ${url}: HTTP ${response.status}.`);
        continue;
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
        limitations.push(`Skipped ${url}: non-HTML response.`);
        continue;
      }
      const html = await response.text();
      if (!normalizeWhitespace(html)) {
        limitations.push(`Skipped ${url}: empty HTML.`);
        continue;
      }
      const extracted = extractPage(normalizeUrl(response.url), html, homepageHost);
      if (!pages.some((page) => page.normalizedUrl === extracted.normalizedUrl)) {
        pages.push(extracted);
      }
    } catch (error) {
      limitations.push(`Skipped ${url}: ${error instanceof Error ? error.message : "Unknown error"}.`);
    }
  }

  const facts = buildFacts(pages, discovered.size + 1, robotsStatus, sitemapStatus);
  const evidenceReceipts = buildEvidenceReceipts(pages);

  if (pages.length <= 2) {
    limitations.push("Evidence is limited because only a small number of public pages were accessible in this bounded scan.");
  }
  if (facts.pagesWithThinContent >= Math.max(1, Math.floor(pages.length / 2))) {
    limitations.push("A large share of the accessible pages had thin rendered text, which lowers confidence in AI-readability conclusions.");
  }

  return {
    inputUrl,
    normalizedUrl: homepageUrl,
    pages,
    facts,
    evidenceReceipts,
    crawlNotes: [
      `Homepage resolved to ${homepageUrl}.`,
      `Analyzed ${pages.length} public pages in a bounded same-domain pass.`,
      `Discovered page types: ${facts.pageTypes.join(", ") || "homepage only"}.`,
    ],
    limitations: dedupe(limitations).slice(0, 6),
  };
}
