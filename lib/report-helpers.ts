import type {
  AgentArtifactPreview,
  AgentVisitorArtifact,
  AioArtifact,
  BeforeAfterPerception,
  CitationArtifact,
  ConfidenceLevel,
  FixPack,
  FixPackActionPathItem,
  FixPackFaqItem,
  FixPrioritizationArtifact,
  GeminiOrchestrationSummary,
  InferredCompetitiveContext,
  LLMPerceptionArtifact,
  MachineFacingGtmRisk,
  ProgressEvent,
  SitePage,
  SiteScanResult,
  TopFix,
  VisibilityReport,
  WebsiteContextArtifact,
  WorkflowAgentId,
  WorkflowTraceItem,
} from "@/lib/types";
import { clamp, dedupe, first, normalizeWhitespace, scoreLabel, sentence, truncate } from "@/lib/utils";

const AGENT_LABELS: Record<WorkflowAgentId, string> = {
  "website-context": "Website Context Agent",
  "llm-perception": "LLM Perception Agent",
  "agent-visitor": "Agent Visitor Agent",
  "aio-answer-engine": "AIO / Answer Engine Agent",
  "citation-readiness": "Citation Readiness Agent",
  "fix-prioritization": "Fix Prioritization Agent",
};

const USER_FACING_LIMITATION_BASE =
  "This is a directional public-page read based on a bounded crawl. Some pages may be blocked, dynamic, or inaccessible from the server environment, so conclusions should be validated before strategic use.";

const GEMINI_LIMITATION_NOTE =
  "Gemini synthesis was limited for this run, so the report used conservative local synthesis from public-page evidence.";

const CTA_NOISE_PATTERNS = [
  /try [a-z0-9 ]*free/gi,
  /get started(?: fast)?/gi,
  /build or grow your business(?: fast)?(?: with ai)?/gi,
  /be the next[a-z0-9 ]*all-star/gi,
  /meet your secret weapon/gi,
  /you could be selling by tomorrow/gi,
  /switch to [a-z0-9]+/gi,
  /get more customers/gi,
  /why [a-z0-9]+back/gi,
  /productsback/gi,
  /backget/gi,
  /the world'?s most [a-z ]+/gi,
];

const NAV_NOISE_PATTERNS = [
  /productsback/i,
  /backget/i,
  /why [a-z0-9]+back/i,
  /website builderthemesdomains/i,
  /customer accounts/i,
  /social & marketplaces/i,
  /there'?s no better place for you to build/i,
  /make more sales\.trusted by/i,
];

const CATEGORY_HINTS = /(platform|software|infrastructure|commerce|ecommerce|retail|payments|checkout|storefront|marketplace|b2b|enterprise|operations|wholesale|merchant|store)/i;

function firstNonEmpty(values: Array<string | undefined>) {
  return values.map((value) => normalizeWhitespace(value || "")).find(Boolean) || "";
}

function takeNonEmpty(items: Array<string | undefined>, limit: number) {
  return dedupe(items.map((item) => normalizeWhitespace(item || "")).filter(Boolean)).slice(0, limit);
}

function ensureNarrativeLength(value: string, minimum: number, fallback: string, suffix: string) {
  const normalized = sentence(normalizeWhitespace(value || "")) || sentence(fallback);
  if (normalized.length >= minimum) return normalized;
  return sentence(`${normalized.replace(/[.!?]$/, "")} ${suffix}`);
}

function pickPage(scan: SiteScanResult, pageType: string) {
  return scan.pages.find((page) => page.pageType === pageType);
}

function formatPageLabel(page: SitePage) {
  const title = firstNonEmpty([page.h1, page.title, page.metaDescription, page.url]);
  return `${title} (${page.pageType})`;
}

function titleLead(text: string, fallback: string) {
  const normalized = normalizeWhitespace(text);
  return normalized ? sentence(truncate(normalized, 200)) : fallback;
}

function cleanBranding(text: string, company: string) {
  const escapedCompany = company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text
    .replace(new RegExp(`^${escapedCompany}\\s*[:\\-–|]\\s*`, "i"), "")
    .replace(new RegExp(`\\s*[:\\-–|]\\s*${escapedCompany}$`, "i"), "")
    .replace(new RegExp(`\\b${escapedCompany}\\b`, "gi"), "")
    .trim();
}


export function stripMarketingCtaLanguage(value: string) {
  let cleaned = normalizeWhitespace(value || "");
  for (const pattern of CTA_NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }
  return normalizeWhitespace(cleaned.replace(/[|]+/g, " "));
}

function collapseDuplicatedWords(value: string) {
  const parts = normalizeWhitespace(value)
    .split(/\s+/)
    .filter(Boolean);
  const collapsed: string[] = [];

  for (const part of parts) {
    if (collapsed[collapsed.length - 1]?.toLowerCase() === part.toLowerCase()) continue;
    collapsed.push(part);
  }

  return normalizeWhitespace(collapsed.join(" "));
}

export function looksLikeNavigationNoise(value: string) {
  const normalized = normalizeWhitespace(value || "");
  if (!normalized) return true;
  if (NAV_NOISE_PATTERNS.some((pattern) => pattern.test(normalized))) return true;

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const compactCaps = (normalized.match(/[A-Z][a-z]+/g) || []).length;
  const delimiters = (normalized.match(/Back|Themes|Domains|Pricing|Products|Solutions|Docs|Developers/gi) || []).length;

  return wordCount > 10 && compactCaps >= 8 && delimiters >= 4 && !/[.!?]/.test(normalized);
}

export function cleanEvidenceText(value: string, maxLength = 220) {
  const cleaned = collapseDuplicatedWords(stripMarketingCtaLanguage(value || ""))
    .replace(/\s*([,:;])\s*/g, "$1 ")
    .replace(/\s*([.!?])\s*/g, "$1 ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!cleaned || looksLikeNavigationNoise(cleaned)) return "";
  return truncate(cleaned, maxLength);
}

export function cleanCategoryText(value: string, company = "") {
  let cleaned = stripMarketingCtaLanguage(value || "");
  if (company) cleaned = cleanBranding(cleaned, company);

  const segments = cleaned
    .split(/[.!?]/)
    .map((segment) => normalizeWhitespace(segment))
    .filter(Boolean);

  const scored = segments
    .map((segment) => {
      const lowered = segment.toLowerCase();
      const hintScore = (segment.match(CATEGORY_HINTS) ? 2 : 0) + (/(for businesses|for enterprise|for brands|for teams|b2b|dtc)/i.test(segment) ? 1 : 0);
      const penalty = /(try|get started|free trial|all-star|secret weapon|tomorrow|chat)/i.test(lowered) ? 3 : 0;
      return { segment, score: hintScore - penalty };
    })
    .sort((left, right) => right.score - left.score);

  const best = scored.find((item) => item.score >= 1)?.segment || segments[0] || "";
  return cleanEvidenceText(best, 140);
}

function joinAudienceList(items: string[]) {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function buildUserFacingLimitations(options?: { geminiLimited?: boolean }) {
  return options?.geminiLimited
    ? `${USER_FACING_LIMITATION_BASE} ${GEMINI_LIMITATION_NOTE}`
    : USER_FACING_LIMITATION_BASE;
}

export function safeCompanyName(scan: SiteScanResult) {
  const title = first(scan.pages)?.title ?? "the company";
  const fragment = title.split(/[|\-–:]/)[0]?.trim();
  if (fragment && fragment.length <= 48) return fragment;
  return scan.normalizedUrl.replace(/^https?:\/\//i, "");
}

function inferAudience(scan: SiteScanResult) {
  const combined = scan.pages
    .flatMap((page) => [
      page.title,
      page.metaDescription,
      page.h1,
      page.bodyText,
      ...page.useCaseSignals,
      ...page.pricingSignals,
      ...page.proofSignals,
      ...page.actionSignals,
    ])
    .map((value) => normalizeWhitespace(value || ""))
    .join(" ")
    .toLowerCase();

  const audiences: string[] = [];
  const addAudience = (label: string, pattern: RegExp) => {
    if (pattern.test(combined) && !audiences.includes(label)) audiences.push(label);
  };

  addAudience("entrepreneurs", /entrepreneur|founder|merchant/);
  addAudience("SMBs", /small business|growing business|businesses|smb/);
  addAudience("commerce teams", /commerce team|retail team|store team|b2b|dtc|wholesale/);
  addAudience("enterprise brands", /enterprise|large brand|global brand|trusted by enterprise brands/);
  addAudience("developers", /developer|api|technical team/);

  if (audiences.length) {
    return sentence(joinAudienceList(audiences.slice(0, 4)));
  }

  if (scan.facts.pagesWithUseCases > 0) {
    return "Business buyers and operators are visible in the public copy, but the audience still needs plainer role-based wording.";
  }

  return "The public site only partly states who the offering is for, which increases the risk of generic machine summaries.";
}

export function inferCleanCategory(scan: SiteScanResult) {
  const company = safeCompanyName(scan);
  const homepage = pickPage(scan, "homepage") || first(scan.pages);
  const productPage = pickPage(scan, "product") || pickPage(scan, "use-cases");
  const enterprisePage = scan.pages.find((page) => /enterprise/i.test(page.url) || /enterprise/i.test(page.title));
  const candidates = dedupe(
    [
      productPage?.title,
      productPage?.metaDescription,
      enterprisePage?.title,
      enterprisePage?.metaDescription,
      homepage?.title,
      homepage?.metaDescription,
      productPage?.h1,
      enterprisePage?.h1,
      homepage?.h1,
    ]
      .map((value) => cleanCategoryText(value || "", company))
      .filter(Boolean),
  );

  const joined = [
    candidates.join(" "),
    scan.pages.flatMap((page) => [page.bodyText, ...page.useCaseSignals, ...page.pricingSignals, ...page.proofSignals]).join(" "),
  ].join(" ").toLowerCase();
  const hasCommerce = /commerce|ecommerce|storefront|retail/.test(joined);
  const hasPlatform = /platform|software|infrastructure/.test(joined);
  const hasEnterprise = /enterprise|plus/.test(joined);
  const hasB2B = /\bb2b\b|wholesale/.test(joined);
  const hasDtc = /\bdtc\b|direct-to-consumer/.test(joined);

  if (hasCommerce && hasPlatform) {
    if (hasEnterprise || hasB2B || hasDtc) {
      return "Commerce platform / ecommerce infrastructure for businesses and enterprises.";
    }
    return "Commerce platform / ecommerce infrastructure for businesses.";
  }

  const preferred = candidates.find((candidate) => CATEGORY_HINTS.test(candidate));
  if (preferred) return sentence(preferred.replace(/\.$/, ""));

  return "Digital product or service platform with category language that still needs tightening for machines.";
}

function inferCompanyCategory(scan: SiteScanResult) {
  return inferCleanCategory(scan);
}

function inferMainOffering(scan: SiteScanResult) {
  const homepage = pickPage(scan, "homepage") || first(scan.pages);
  const productPage = pickPage(scan, "product") || pickPage(scan, "pricing") || pickPage(scan, "use-cases");
  const enterprisePage = scan.pages.find((page) => /enterprise/i.test(page.url) || /enterprise/i.test(page.title));
  const source = firstNonEmpty([
    cleanEvidenceText(productPage?.metaDescription || "", 220),
    cleanEvidenceText(enterprisePage?.metaDescription || "", 220),
    cleanEvidenceText(productPage?.h1 || "", 180),
    cleanEvidenceText(homepage?.metaDescription || "", 220),
    cleanEvidenceText(homepage?.h1 || "", 180),
  ]);

  return ensureNarrativeLength(
    source,
    24,
    "The main offering is directionally visible, but the public pages still need a clearer machine-readable explanation of product scope and buyer path.",
    "The public evidence is limited, so this offering summary remains conservative.",
  );
}

function buildKeyPagesFound(scan: SiteScanResult) {
  const pages = dedupe(scan.pages.map(formatPageLabel)).slice(0, 6);

  if (pages.length >= 2) return pages;
  if (pages.length === 1) {
    return [...pages, "Additional high-signal pages were limited in this bounded crawl. (crawl)"].slice(0, 6);
  }

  return [
    "Homepage surface was captured in a limited bounded crawl. (homepage)",
    "Additional high-signal pages were limited in this bounded crawl. (crawl)",
  ];
}

function buildProofSignalsFound(scan: SiteScanResult) {
  const signals = takeNonEmpty(
    scan.pages.flatMap((page) => [
      cleanEvidenceText(page.proofSignals[0] || "", 180) || undefined,
      cleanEvidenceText(page.trustSignals[0] || "", 180) || undefined,
      cleanEvidenceText(page.citationSignals[0] || "", 180) || undefined,
      page.schemaTypes[0] ? `Structured data present: ${page.schemaTypes.join(", ")}` : undefined,
    ]),
    5,
  );

  if (signals.length) return signals;

  return [
    "Proof, citation, or trust signals were sparse in the bounded crawl, so machine confidence is likely limited.",
  ];
}

function buildMissingBasics(scan: SiteScanResult) {
  const basics: string[] = [];

  if (scan.facts.pagesWithPricing === 0) {
    basics.push("Public pricing, packaging, or commercial motion is not clearly exposed.");
  }
  if (scan.facts.pagesWithProof === 0) {
    basics.push("Core claims need visible proof, outcomes, or named credibility support.");
  }
  if (scan.facts.pagesWithActions <= 1) {
    basics.push("The next-step path for a buyer or agent is not consistently obvious.");
  }
  if (scan.facts.pagesWithSchema === 0) {
    basics.push("No reinforcing structured data was detected on the highest-signal pages.");
  }
  if (scan.facts.pagesWithUseCases === 0) {
    basics.push("Audience and use-case framing remain too implicit in the rendered copy.");
  }
  if (basics.length === 0) {
    basics.push("Machine readability is solid overall, but the site can still tighten proof packaging and action-path clarity.");
  }

  return basics.slice(0, 5);
}

export function buildWebsiteContextArtifact(scan: SiteScanResult): WebsiteContextArtifact {
  return {
    companyCategory: inferCompanyCategory(scan),
    likelyAudience: inferAudience(scan),
    mainOffering: inferMainOffering(scan),
    keyPagesFound: buildKeyPagesFound(scan),
    proofSignalsFound: buildProofSignalsFound(scan),
    missingBasics: buildMissingBasics(scan),
  };
}

function normalizeFixKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function distinctTopFixFallbacks(): TopFix[] {
  return [
    {
      fix: "Clarify machine-readable category and audience across homepage and product surfaces",
      whyItMatters: "Machines summarize and route more confidently when category and buyer language are explicit, repeated, and noun-based.",
      impact: "High",
      effort: "Low",
    },
    {
      fix: "Package proof next to primary claims",
      whyItMatters: "Public proof is stronger when the claim, supporting evidence, and buyer context sit together instead of being scattered.",
      impact: "High",
      effort: "Medium",
    },
    {
      fix: "Clarify pricing, packaging, and evaluation path",
      whyItMatters: "AI agents need to understand whether the correct next step is self-serve, sales-led, or enterprise evaluation.",
      impact: "High",
      effort: "Medium",
    },
    {
      fix: "Add or strengthen schema and structured data on core commercial pages",
      whyItMatters: "Structured reinforcement helps machines confirm the organization, offering, FAQ intent, and page relationships.",
      impact: "Medium",
      effort: "Low",
    },
    {
      fix: "Connect homepage, product, pricing, enterprise, and docs paths with consistent action language",
      whyItMatters: "A clear, repeated action path makes it easier for machine-mediated buyers to move from understanding to action.",
      impact: "Medium",
      effort: "Low",
    },
  ];
}

export function buildTopFixes(scan: SiteScanResult): TopFix[] {
  const category = inferCleanCategory(scan).toLowerCase();
  const joined = scan.pages
    .flatMap((page) => [page.title, page.metaDescription, page.h1, page.bodyText])
    .join(" ")
    .toLowerCase();
  const candidates: TopFix[] = [];
  const add = (fix: TopFix) => {
    if (!candidates.some((item) => normalizeFixKey(item.fix) === normalizeFixKey(fix.fix))) {
      candidates.push(fix);
    }
  };

  if (scan.facts.pagesWithUseCases === 0) {
    add({
      fix: "Add one plain-English homepage block that states category, audience, and workflow outcome",
      whyItMatters: "Machines need the company, buyer, and use case to be obvious in rendered text before they can summarize or route intent well.",
      impact: "High",
      effort: "Low",
    });
  } else if (/commerce|ecommerce/.test(category) && /enterprise|b2b|dtc/.test(joined)) {
    add({
      fix: "Make the B2B, DTC, and enterprise distinction more machine-readable across homepage and enterprise pages",
      whyItMatters: "Strong sites still benefit when buyer segments and commercial motions are easier for machines to separate and cite.",
      impact: "High",
      effort: "Low",
    });
  }

  if (scan.facts.pagesWithProof === 0) {
    add({
      fix: "Pair the primary claims with visible proof, outcomes, or customer credibility markers",
      whyItMatters: "Answer engines and machine-mediated buyers are more likely to trust claims that have nearby evidence.",
      impact: "High",
      effort: "Medium",
    });
  } else {
    add({
      fix: "Package proof closer to homepage and enterprise claims",
      whyItMatters: "Even a strong proof base performs better when measured outcomes, trust cues, and enterprise signals sit next to the claims they support.",
      impact: "High",
      effort: "Low",
    });
  }

  if (scan.facts.pagesWithPricing === 0) {
    add({
      fix: "Expose pricing logic, plans, or commercial packaging in public copy",
      whyItMatters: "AI agents often stall when they cannot infer whether there is a self-serve, sales-led, or enterprise buying path.",
      impact: "High",
      effort: "Medium",
    });
  } else {
    add({
      fix: "Clarify the enterprise evaluation path alongside plans and product proof",
      whyItMatters: "Machines should be able to tell when to route a buyer into plans, self-serve setup, or a higher-touch enterprise motion.",
      impact: "High",
      effort: "Low",
    });
  }

  if (scan.facts.pagesWithSchema === 0) {
    add({
      fix: "Add lightweight schema to the core company, product, and FAQ surfaces",
      whyItMatters: "Structured reinforcement can reduce ambiguity around the organization, product, and offer model.",
      impact: "Medium",
      effort: "Low",
    });
  } else {
    add({
      fix: "Reinforce product, organization, FAQ, and enterprise page schema",
      whyItMatters: "Existing structured data is a good baseline, but broader reinforcement makes the category, offering, and page intent easier to confirm.",
      impact: "Medium",
      effort: "Low",
    });
  }

  if (/sidekick|ai assistant|ai/.test(joined)) {
    add({
      fix: "Make AI and assistant positioning more citeable with one short explainer and nearby proof",
      whyItMatters: "AI features are easy for machines to overgeneralize unless the role, audience, and supporting proof are tightly framed.",
      impact: "Medium",
      effort: "Low",
    });
  }

  if (scan.facts.pagesWithActions <= 1) {
    add({
      fix: "Create a cleaner buyer action path across homepage, product, and pricing surfaces",
      whyItMatters: "Understanding alone is not enough if a machine still cannot determine the correct next action for a buyer.",
      impact: "High",
      effort: "Low",
    });
  } else {
    add({
      fix: "Connect homepage, product, pricing, enterprise, and docs paths with consistent action language",
      whyItMatters: "A repeated action path keeps machine-mediated routing coherent across different entry points.",
      impact: "Medium",
      effort: "Low",
    });
  }

  if (scan.facts.pagesWithThinContent > 0) {
    add({
      fix: "Increase explanatory text on thin pages so key buyer logic is extractable without visual context",
      whyItMatters: "Machines cannot reliably infer the missing logic that human readers may pick up from layout or design alone.",
      impact: "Medium",
      effort: "Medium",
    });
  }

  for (const fallback of distinctTopFixFallbacks()) add(fallback);

  return candidates.slice(0, 5);
}

export function buildLLMPerceptionArtifact(
  scan: SiteScanResult,
  websiteContextArtifact = buildWebsiteContextArtifact(scan),
): LLMPerceptionArtifact {
  const company = safeCompanyName(scan);
  const category = websiteContextArtifact.companyCategory.replace(/\.$/, "");
  const audience = websiteContextArtifact.likelyAudience.replace(/\.$/, "");
  const offering = websiteContextArtifact.mainOffering.replace(/\.$/, "");

  return {
    likelySummary: ensureNarrativeLength(
      `${company} appears to be a ${category.toLowerCase()} for ${audience.toLowerCase()}, with public signals pointing to ${offering.toLowerCase()}`,
      24,
      `${company} appears to have a real public web presence, but the company and offering still risk being summarized too generically by LLMs.`,
      "Public site evidence is sparse, so this likely machine summary remains directional and incomplete.",
    ),
    positioningInterpretation:
      scan.facts.pagesWithUseCases > 0
        ? sentence(`Public signals suggest the company will likely be interpreted as ${truncate(category, 150)}`)
        : "The likely positioning interpretation is directionally understandable, but category language is still loose enough to invite flattening or over-generalization.",
    possibleMisreadings: takeNonEmpty(
      [
        scan.facts.pagesWithUseCases === 0
          ? "The company may be described too broadly because audience and workflow language are still implied instead of stated plainly."
          : "A model may still flatten the company into a broader category if the strongest category and audience cues are not repeated across homepage, product, and enterprise pages.",
        scan.facts.pagesWithPricing === 0
          ? "An LLM may miss the commercial motion because pricing and packaging remain unclear on public pages."
          : "A model may understand the product but still blur the difference between self-serve, growth, and enterprise paths.",
        scan.facts.pagesWithProof === 0
          ? "Claims may be repeated without enough proof context, which lowers confidence in a machine-generated summary."
          : "Strong proof exists, but machines may not cite it cleanly if outcomes, trust cues, and commercial claims stay too far apart.",
      ],
      3,
    ),
  };
}

export function buildAgentVisitorArtifact(scan: SiteScanResult): AgentVisitorArtifact {
  return {
    whatAgentsCanUnderstand: takeNonEmpty(
      [
        scan.pages.length ? `The site exposes ${scan.facts.pagesAnalyzed} public pages in this bounded pass.` : undefined,
        scan.facts.pagesWithUseCases > 0
          ? "Some audience or workflow intent is visible in rendered HTML."
          : "The site at least establishes that a company and offering exist, even if the audience remains fuzzy.",
        scan.facts.pagesWithActions > 0
          ? "At least one next-step path is public and machine-visible."
          : "Core pages can be read, but the next step is still not consistently machine-clear.",
      ],
      4,
    ),
    journeyBlockers: takeNonEmpty(
      [
        scan.facts.pagesWithPricing === 0
          ? "Machines may not understand the buyer or action path because pricing and packaging are not clearly public."
          : "The buyer path is present, but pricing and evaluation logic may still be fragmented across pages.",
        scan.facts.pagesWithProof === 0
          ? "Sparse proof signals can stop an agent from recommending the product with confidence."
          : "Proof exists, but it may not sit close enough to the claims or action path for fast machine trust-building.",
        scan.facts.pagesWithActions <= 1
          ? "The site does not yet make the next action obvious across the homepage, product, and commercial surfaces."
          : "The next-step path exists, but it is not yet reinforced with role-specific action language.",
      ],
      4,
    ),
    actionabilityGaps: takeNonEmpty(
      [
        scan.facts.pagesWithActions > 0
          ? "The action path should be linked more tightly to proof and pricing so an agent can move from understanding to action."
          : "A cleaner CTA and evaluation path is needed after the machine identifies the product and audience.",
        scan.facts.pagesWithUseCases === 0
          ? "Role-based or use-case copy is too thin to support buyer routing or intent qualification."
          : "Role-specific copy exists, but the commercial next step still needs to be easier to infer.",
        "Important buying logic may still live in visual design rather than plainly extractable text.",
      ],
      4,
    ),
  };
}

export function buildAioArtifact(scan: SiteScanResult): AioArtifact {
  const strengths = takeNonEmpty(
    [
      scan.facts.pagesWithUseCases > 0 ? "The site provides at least some use-case or workflow context for answer engines." : undefined,
      scan.facts.pagesWithProof > 0 ? "Public proof signals give answer engines some material they can cite or paraphrase." : undefined,
      scan.facts.pagesWithSchema > 0 ? "Structured data is present on at least one high-signal page." : undefined,
    ],
    4,
  );

  const weaknesses = takeNonEmpty(
    [
      scan.facts.pagesWithPricing === 0 ? "Commercial packaging is not explicit enough for a clean answer-surface interpretation." : undefined,
      scan.facts.pagesWithProof === 0 ? "Claims are not supported with enough nearby evidence for strong answer confidence." : undefined,
      scan.facts.pagesWithThinContent > 0 ? "Thin pages limit the amount of reusable explanatory text available to answer engines." : undefined,
      scan.facts.pagesWithActions <= 1 ? "The buying path still needs clearer rendered next-step language for agent-mediated journeys." : undefined,
    ],
    4,
  );

  const contentStructureIssues = takeNonEmpty(
    [
      scan.facts.pagesWithSchema === 0 ? "Organization, product, FAQ, or offer intent is not reinforced with schema on the bounded crawl pages." : undefined,
      scan.facts.pagesWithUseCases === 0 ? "Category and audience language are not repeated consistently enough across the crawl path." : undefined,
      scan.facts.pagesWithActions <= 1 ? "Action-path copy is too sparse or too disconnected from the explanatory content." : undefined,
      "Important machine-readable context should stay in rendered text, not only in visual layout or implied page structure.",
    ],
    4,
  );

  return {
    strengths: strengths.length
      ? strengths
      : ["The site has at least a baseline public surface that answer engines can crawl and summarize directionally."],
    weaknesses: weaknesses.length
      ? weaknesses
      : ["Even strong public sites benefit from tighter proof packaging and clearer machine-facing commercial context."],
    answerEngineObservations: takeNonEmpty(
      [
        scan.facts.pagesWithUseCases > 0
          ? "Answer surfaces will likely understand the broad problem area, but may still compress the positioning."
          : "Answer surfaces may return a generic category description because the buyer problem is not stated explicitly enough.",
        scan.facts.pagesWithProof > 0
          ? "Visible proof increases the odds of a more trustworthy directional summary, though not guaranteed citation behavior."
          : "Without stronger proof packaging, answer surfaces may summarize the site but hesitate to support specific claims.",
      ],
      4,
    ),
    contentStructureIssues: contentStructureIssues.length >= 2
      ? contentStructureIssues
      : [
          ...contentStructureIssues,
          "Important machine-readable context should stay in rendered text, not only in visual layout or implied page structure.",
          "Core buyer-path information should be repeated consistently across homepage, product, and commercial pages.",
        ].slice(0, 4),
  };
}

export function buildCitationArtifact(scan: SiteScanResult): CitationArtifact {
  const proofSignals = takeNonEmpty(scan.pages.flatMap((page) => page.proofSignals), 4);
  const trustSignals = takeNonEmpty(scan.pages.flatMap((page) => page.trustSignals), 4);
  const proofGaps = takeNonEmpty(
    [
      scan.facts.pagesWithProof === 0
        ? "Add named customers, measured outcomes, certifications, or documented implementation evidence near the main claims."
        : "Tighten the proof format so outcomes, sources, and claim language are easier for machines to quote directionally.",
      scan.facts.pagesWithUseCases === 0
        ? "Use-case proof is missing, so buyers and machines may struggle to map evidence to a specific audience or workflow."
        : "Pair proof statements with audience or workflow context so machines can map the evidence to the right buyer scenario.",
    ],
    4,
  );

  return {
    strongClaims:
      proofSignals.length > 0
        ? proofSignals
        : ["The site communicates the company narrative, but the strongest claims still need more verifiable packaging."],
    weakClaims: takeNonEmpty(
      [
        scan.facts.pagesWithProof === 0
          ? "Differentiation claims appear stronger than the visible proof that currently supports them."
          : "Some higher-level value claims would still benefit from explicit metrics, named evidence, or linked documentation.",
        scan.facts.pagesWithPricing === 0
          ? "Commercial claims are harder to evaluate because plans, packaging, or evaluation criteria are not clearly public."
          : undefined,
      ],
      4,
    ),
    proofGaps: proofGaps.length >= 2
      ? proofGaps
      : [
          ...proofGaps,
          "Pair proof statements with audience or workflow context so machines can map the evidence to the right buyer scenario.",
        ].slice(0, 4),
    trustGaps:
      trustSignals.length > 0
        ? trustSignals
        : ["Trust signals like compliance, security, or documented validation are not prominent enough in the bounded crawl."],
  };
}

function normalizeAudienceSummary(value: string) {
  return value
    .replace(/^Likely audience:\s*/i, "")
    .replace(/^Likely audience appears to be\s*/i, "")
    .replace(/^Likely audience is\s*/i, "")
    .replace(/\.$/, "")
    .trim();
}

function buildHomepageSummaryBlock(
  scan: SiteScanResult,
  websiteContextArtifact: WebsiteContextArtifact,
  citationArtifact: CitationArtifact,
) {
  const company = safeCompanyName(scan);
  const audience = truncate(normalizeAudienceSummary(websiteContextArtifact.likelyAudience), 120);
  const offering = truncate(websiteContextArtifact.mainOffering.replace(/\.$/, ""), 170);
  const proof = truncate(cleanEvidenceText(first(citationArtifact.strongClaims) || "", 120) || "visible proof such as measured outcomes, named customer credibility, or trust markers", 120);

  return sentence(
    `${company} is a ${websiteContextArtifact.companyCategory.replace(/\.$/, "").toLowerCase()} for ${audience.toLowerCase()}. It should say, in one machine-readable block, that it helps buyers with ${offering.toLowerCase()}, then support the primary claim with ${proof} and a clear next step for plans, demo, or enterprise evaluation`,
  );
}

function buildFaqBlock(scan: SiteScanResult, websiteContextArtifact: WebsiteContextArtifact): FixPackFaqItem[] {
  const company = safeCompanyName(scan);
  const category = websiteContextArtifact.companyCategory.replace(/\.$/, "");
  const audience = normalizeAudienceSummary(websiteContextArtifact.likelyAudience);
  const offering = websiteContextArtifact.mainOffering.replace(/\.$/, "");

  return [
    {
      question: `What does ${company} do?`,
      answer: sentence(`${company} is presented as a ${category.toLowerCase()} with public signals that point to ${offering.toLowerCase()}`),
    },
    {
      question: `Who is ${company} for?`,
      answer: sentence(audience || "The site should state the primary buyer, operator, or team segment in one plain-language sentence."),
    },
    {
      question: `What problem does ${company} help solve?`,
      answer: sentence(
        scan.facts.pagesWithUseCases > 0
          ? "The public copy should connect the offer to one or two concrete workflows so answer engines can map the company to the right buyer need quickly"
          : "The site should add a short workflow-oriented explanation that states the buyer problem, the product role, and the expected outcome",
      ),
    },
    {
      question: `What proof should a buyer or machine see?`,
      answer: sentence(
        scan.facts.pagesWithProof > 0
          ? "Keep customer outcomes, trust markers, enterprise proof, or measured results close to the main value claims so they are easy to cite directionally"
          : "Add verified proof such as named customers, measured outcomes, security posture, or implementation evidence near the main claims",
      ),
    },
    {
      question: `What is the best next step?`,
      answer: sentence(
        scan.facts.pagesWithPricing > 0
          ? "Make the site state whether the next step is reviewing plans, requesting a demo, or starting an enterprise evaluation"
          : "Add a buyer-path line that explains whether the visitor should request pricing, book a demo, or begin an enterprise evaluation",
      ),
    },
  ];
}

function buildCitationReadyProofBlock(scan: SiteScanResult, citationArtifact: CitationArtifact) {
  const currentStrong = citationArtifact.strongClaims
    .map((claim) => cleanEvidenceText(claim, 180))
    .filter(Boolean)
    .slice(0, 2)
    .map((claim) => truncate(sentence(`Turn this into a citation-ready proof line with a source, scope, or metric: ${claim}`), 260));
  const gapDriven = citationArtifact.proofGaps
    .slice(0, 2)
    .map((gap) => truncate(sentence(`Add a proof line in this format: ${gap}`), 260));
  const commercial = scan.facts.pagesWithPricing === 0
    ? [truncate("Add a public commercial qualifier such as plan ranges, implementation scope, or enterprise evaluation criteria so machine-mediated buyers can understand the buying motion.", 260)]
    : [truncate("Place the strongest proof line beside the relevant pricing or enterprise-evaluation path so agents can connect trust to action.", 260)];

  return [...currentStrong, ...gapDriven, ...commercial].slice(0, 5);
}

function buildActionPathCopy(scan: SiteScanResult): FixPackActionPathItem[] {
  const docsPath = pickPage(scan, "docs");

  return [
    {
      label: "Pricing path",
      copy: sentence(
        scan.facts.pagesWithPricing > 0
          ? "Review plans, pricing logic, and packaging to determine the right fit before contacting the team"
          : "Request pricing, packaging details, and buyer-fit guidance if you need commercial evaluation information",
      ),
    },
    {
      label: "Demo / request path",
      copy: "If you want a guided walkthrough, request a demo with your use case, team size, and evaluation goals so the right workflow can be shown.",
    },
    {
      label: "Enterprise evaluation path",
      copy: "For enterprise evaluation, share your security, integration, rollout, and procurement requirements so the team can scope fit clearly.",
    },
    {
      label: "Docs path",
      copy: docsPath
        ? "For technical validation, review the documentation and implementation details before starting a production evaluation."
        : "If technical documentation exists, link it directly from the core product path so agents can route implementation-minded buyers cleanly.",
    },
  ];
}

function buildSchemaPlan(scan: SiteScanResult) {
  const plan = [
    "Organization schema on the homepage and about surface to reinforce core company identity and official links.",
    "Product or SoftwareApplication schema on the main product surface to clarify what the offering is and how it should be categorized.",
    "FAQ schema for the answer-engine FAQ block so core buyer questions are machine-readable.",
    "Breadcrumb schema on deeper product, pricing, and documentation paths to reinforce page relationships.",
  ];

  if (scan.facts.pagesWithProof > 0) {
    plan.push("Review or AggregateRating schema only where real, supportable review evidence exists publicly.");
  } else {
    plan.push("After verified proof exists, consider Review or AggregateRating schema only where it is fully supportable.");
  }

  return plan.slice(0, 5);
}

export function buildFixPack(
  scan: SiteScanResult,
  websiteContextArtifact = buildWebsiteContextArtifact(scan),
  citationArtifact = buildCitationArtifact(scan),
): FixPack {
  return {
    homepageSummaryBlock: buildHomepageSummaryBlock(scan, websiteContextArtifact, citationArtifact),
    faqBlock: buildFaqBlock(scan, websiteContextArtifact),
    citationReadyProofBlock: buildCitationReadyProofBlock(scan, citationArtifact),
    agentActionPathCopy: buildActionPathCopy(scan),
    schemaPlan: buildSchemaPlan(scan),
  };
}

export function buildFixPrioritizationArtifact(
  scan: SiteScanResult,
  topFixes = buildTopFixes(scan),
): FixPrioritizationArtifact {
  const strongBaseline =
    scan.facts.pagesWithPricing > 0 &&
    scan.facts.pagesWithProof > 0 &&
    scan.facts.pagesWithUseCases > 0 &&
    scan.facts.pagesWithActions > 1;

  return {
    topActions: topFixes.map((fix) => ({
      action: fix.fix,
      impact: fix.impact,
      effort: fix.effort,
      whyItMatters: fix.whyItMatters,
    })),
    fixPackSummary: [
      strongBaseline
        ? "Baseline machine readability is already strong, so the first-week work is refinement, not emergency repair."
        : "Start with the highest-leverage clarity and buyer-path repairs first.",
      "Paste-ready homepage summary and FAQ copy to reinforce category, audience, and next-step routing.",
      "Citation-ready proof packaging and a practical schema plan for the highest-signal pages.",
      "Action-path copy for pricing, demo, enterprise evaluation, and docs routing.",
    ],
    firstWeekFocus: sentence(
      strongBaseline
        ? `Baseline is strong. This week, ${topFixes[0]?.fix || "tighten the highest-leverage machine-facing refinement"}`
        : topFixes[0]?.fix || "Start with the highest-impact homepage clarity fix this week",
    ),
  };
}

export function buildBeforeAfterPerception(
  scan: SiteScanResult,
  llmPerceptionArtifact = buildLLMPerceptionArtifact(scan),
  websiteContextArtifact = buildWebsiteContextArtifact(scan),
  fixPack = buildFixPack(scan, websiteContextArtifact),
): BeforeAfterPerception {
  const company = safeCompanyName(scan);

  return {
    currentLikelySummary: llmPerceptionArtifact.likelySummary,
    improvedLikelySummary: sentence(
      `Directional simulation only: if the proposed homepage summary, FAQ, proof packaging, and action-path copy were added, ${company} would be more likely to be interpreted as a clearly categorized company for a clearly stated audience, with stronger proof support and a cleaner next-step path for machine-mediated buyers`,
    ),
    whatChanged: [
      "Clearer category framing based on the proposed homepage summary and FAQ block.",
      "Clearer audience and workflow language for answer engines and agent visitors.",
      "Stronger proof packaging through citation-ready claims and evidence formatting.",
      "Cleaner buyer action path across pricing, demo, enterprise evaluation, and docs routing.",
      "Improved machine readability from tighter structure and schema reinforcement.",
      "Improved citation support, directionally, through more explicit proof and trust signals.",
      sentence(`Projected improvement is based on the proposed changes in this Fix Pack: ${truncate(fixPack.homepageSummaryBlock, 180)}`),
    ].slice(0, 6),
  };
}

function compactCategoryLabel(value: string) {
  const normalized = cleanCategoryText(value).replace(/\.$/, "").trim();
  if (!normalized) return "machine-readable market category";
  return truncate(normalized, 72);
}

export function buildInferredCompetitiveContext(
  scan: SiteScanResult,
  websiteContextArtifact = buildWebsiteContextArtifact(scan),
): InferredCompetitiveContext {
  const categoryLabel = compactCategoryLabel(websiteContextArtifact.companyCategory);
  const categoryConfidence: ConfidenceLevel =
    scan.facts.pagesWithUseCases > 0 && scan.facts.pagesWithThinContent === 0
      ? "High"
      : scan.facts.pagesWithUseCases > 0 || scan.facts.pagesWithProof > 0
        ? "Medium"
        : "Low";
  const audience = normalizeAudienceSummary(websiteContextArtifact.likelyAudience) || "the implied buyer segment";
  const likelyPeerSet: InferredCompetitiveContext["likelyPeerSet"] = [
    {
      name: /commerce|ecommerce/.test(categoryLabel.toLowerCase())
        ? "Commerce platforms with stronger enterprise proof packaging"
        : `${categoryLabel} vendors with stronger proof packaging`,
      confidence: categoryConfidence,
      whyInferred: sentence(
        "Likely inferred from public site signals showing a clear product story but room to make enterprise-grade proof easier for machines to quote and compare",
      ),
    },
    {
      name: /commerce|ecommerce/.test(categoryLabel.toLowerCase())
        ? "Ecommerce infrastructure vendors with clearer buyer routing"
        : `${categoryLabel} vendors with clearer buyer routing`,
      confidence: (scan.facts.pagesWithActions > 1 ? "Medium" : "High") as ConfidenceLevel,
      whyInferred: sentence(
        `Likely inferred from public site signals around how directly the site guides ${audience.toLowerCase()} into pricing, demo, or enterprise evaluation next steps`,
      ),
    },
    {
      name: /commerce|ecommerce/.test(categoryLabel.toLowerCase())
        ? "Retail technology platforms with stronger structured data"
        : `${categoryLabel} vendors with stronger structured data`,
      confidence: (scan.facts.pagesWithSchema > 0 ? "Medium" : "High") as ConfidenceLevel,
      whyInferred: sentence(
        "Likely inferred from public site signals about structured data, repeated category wording, and how easily answer engines can reuse the site narrative",
      ),
    },
    {
      name: /commerce|ecommerce/.test(categoryLabel.toLowerCase())
        ? "Marketplace and storefront platforms with clearer category framing"
        : `${categoryLabel} vendors with clearer category framing`,
      confidence: "Medium" as ConfidenceLevel,
      whyInferred: sentence(
        "Likely inferred from public site signals that suggest the category is real and legible, but still benefits from tighter noun-based framing across core pages",
      ),
    },
  ].slice(0, scan.facts.pagesWithSchema > 0 ? 4 : 3);

  return {
    inferredCategory: sentence(categoryLabel.replace(/\.$/, "")),
    categoryConfidence,
    likelyPeerSet,
    competitivePerceptionGap: sentence(
      scan.facts.pagesWithUseCases > 0
        ? "The site appears likely to belong in a clear category, but its machine-facing differentiation can still be packaged more tightly than the strongest peer narratives AI systems compress into summaries"
        : "The site appears likely to fit a real market category, but category language is still loose enough that AI systems may flatten it into a generic software or service label",
    ),
    categoryVisibilityRisk: sentence(
      scan.facts.pagesWithProof > 0 && scan.facts.pagesWithActions > 1
        ? "Category visibility risk looks moderate because the company is directionally legible, but proof, buyer routing, or repeated machine-readable cues still need tighter packaging"
        : "Category visibility risk looks elevated because a machine may understand that the company exists without confidently understanding why it is distinct, citeable, or easy to route",
    ),
    differentiationNotes: [
      sentence("Use category language consistently across homepage, product, pricing, and enterprise pages so machine summaries do not drift"),
      sentence("Keep proof and audience context close to the main value proposition so differentiation is supported, not merely asserted"),
      sentence("Strengthen action-path clarity so machine-mediated buyers can distinguish this offer from adjacent options in the same category"),
    ].slice(0, 3),
    validationNote: sentence(
      "This is directional competitive context inferred from public site signals, not a verified market map, official competitor list, or claim about which company an AI system would prefer",
    ),
  };
}

function severityFromScore(score: number): "High" | "Medium" | "Low" {
  if (score >= 75) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

export function buildMachineFacingGtmRisks(
  scan: SiteScanResult,
  websiteContextArtifact = buildWebsiteContextArtifact(scan),
): MachineFacingGtmRisk[] {
  const misclassificationRiskScore = scan.facts.pagesWithUseCases === 0 ? 88 : scan.facts.pagesWithThinContent > 0 ? 62 : 38;
  const citationWeaknessScore = scan.facts.pagesWithProof === 0 ? 90 : scan.facts.pagesWithProof === 1 ? 64 : 36;
  const journeyBlockerScore = scan.facts.pagesWithActions <= 1 ? 86 : 42;
  const buyerRoutingScore = scan.facts.pagesWithPricing === 0 ? 84 : scan.facts.pagesWithActions <= 1 ? 58 : 34;
  const trustGapScore = scan.facts.pagesWithProof === 0 && scan.facts.pagesWithSchema === 0 ? 82 : scan.facts.pagesWithProof === 0 ? 64 : 32;

  return [
    {
      riskName: "Misclassification Risk",
      severity: severityFromScore(misclassificationRiskScore),
      whyItMatters: sentence(
        `If category and audience framing stay implicit, AI systems may classify the company too broadly instead of understanding it as ${compactCategoryLabel(websiteContextArtifact.companyCategory).toLowerCase()}`,
      ),
      suggestedFix: "Add one plain-language category and audience block on the homepage, then repeat that framing on product and commercial pages.",
    },
    {
      riskName: "Citation Weakness Risk",
      severity: severityFromScore(citationWeaknessScore),
      whyItMatters: sentence(
        scan.facts.pagesWithProof > 0
          ? "Some proof exists, but it still needs tighter formatting so answer engines can reuse it as evidence instead of paraphrasing softer claims"
          : "Without visible outcomes, named proof, or stronger credibility packaging, machines may summarize the company without confidently supporting the main claims",
      ),
      suggestedFix: "Pair each major claim with a nearby proof statement, outcome, customer example, or trust marker written in citation-ready language.",
    },
    {
      riskName: "Agent Journey Blocker",
      severity: severityFromScore(journeyBlockerScore),
      whyItMatters: sentence(
        "Understanding is not enough if an agent still cannot determine the next useful action after reading the site",
      ),
      suggestedFix: "Make the next-step path explicit across homepage, product, and pricing surfaces, with clear routing for demo, evaluation, or self-serve intent.",
    },
    {
      riskName: "Buyer Routing Risk",
      severity: severityFromScore(buyerRoutingScore),
      whyItMatters: sentence(
        scan.facts.pagesWithPricing > 0
          ? "Even with commercial signals present, fragmented routing can make it harder for a machine to connect the right buyer to the right path"
          : "If commercial packaging is unclear, machines may struggle to infer whether the offer is self-serve, sales-led, or enterprise-evaluation driven",
      ),
      suggestedFix: "Clarify plans, packaging, or evaluation criteria, then connect that language directly to the relevant CTA path.",
    },
    {
      riskName: "Trust Gap",
      severity: severityFromScore(trustGapScore),
      whyItMatters: sentence(
        "Machine-facing trust depends on visible proof, structured cues, and consistent credibility signals, not brand polish alone",
      ),
      suggestedFix: "Strengthen public trust markers such as implementation evidence, security posture, customer outcomes, or structured data that reinforces official identity.",
    },
  ];
}

export function buildGeminiOrchestrationSummary(): GeminiOrchestrationSummary {
  return {
    overview: sentence(
      "This is a bounded Gemini agent workflow with six specialized stages, visible artifacts, and evidence-constrained outputs, optimized for enterprise reliability and inspectability rather than performative autonomy",
    ),
    steps: [
      {
        agentName: "Website Context Agent",
        job: "Captured public facts, category clues, page coverage, and missing basics from the bounded website scan.",
        outputArtifact: "Site facts captured",
      },
      {
        agentName: "LLM Perception Agent",
        job: "Modeled the likely machine summary, positioning interpretation, and possible misreadings based on public signals.",
        outputArtifact: "Likely machine summary",
      },
      {
        agentName: "Agent Visitor Agent",
        job: "Identified what an AI buyer agent can understand, where the journey stalls, and which next-step paths remain unclear.",
        outputArtifact: "Agent shopper journey blockers",
      },
      {
        agentName: "AIO / Answer Engine Agent",
        job: "Assessed answer-surface readiness, structure quality, and how easily the site narrative can be reused by answer engines.",
        outputArtifact: "Answer-engine readiness findings",
      },
      {
        agentName: "Citation Readiness Agent",
        job: "Reviewed claims, proof density, and trust packaging to surface evidence gaps that limit machine confidence.",
        outputArtifact: "Evidence and proof gaps",
      },
      {
        agentName: "Fix Prioritization Agent",
        job: "Converted the findings into an executive brief, a Fix Pack, and the first-week priority list.",
        outputArtifact: "Fix Pack + top 5 actions",
      },
    ],
  };
}

function fallbackReceipts(scan: SiteScanResult) {
  if (scan.evidenceReceipts.length >= 4) return scan.evidenceReceipts.slice(0, 8);

  const seeded = [...scan.evidenceReceipts];
  for (const page of scan.pages) {
    if (seeded.length >= 4) break;
    seeded.push({
      sourceName: page.title || page.url,
      sourceUrl: page.url,
      signal: `${page.pageType} page was accessible in the bounded crawl.`,
      whyItMatters: "Accessible, descriptive pages give answer engines and agents more usable public context.",
      snippet: cleanEvidenceText(page.snippet || page.metaDescription || page.h1 || page.title, 220) || truncate(page.metaDescription || page.h1 || page.title, 220),
    });
  }

  return seeded.slice(0, 8);
}

export function buildFallbackMermaid(scan: SiteScanResult) {
  const productState = scan.facts.pagesWithUseCases > 0 ? "strong" : "partial";
  const proofState = scan.facts.pagesWithProof > 0 ? "strong" : "blocked";
  const pricingState = scan.facts.pagesWithPricing > 0 ? "strong" : "partial";
  const outcomeState = scan.facts.pagesWithActions > 0 ? "strong" : "blocked";

  return `flowchart LR
    A[Company URL]:::strong --> B[Homepage]:::strong
    B --> C[Product clarity]:::${productState}
    C --> D[Proof and citations]:::${proofState}
    D --> E[Pricing and action path]:::${pricingState}
    E --> F[AI answer or agent recommendation]:::${outcomeState}
    classDef strong fill:#dff2e5,stroke:#3e8f5c,color:#1d4426,stroke-width:2px;
    classDef partial fill:#fbf3df,stroke:#d1a542,color:#7d5a13,stroke-width:2px;
    classDef blocked fill:#fdeeea,stroke:#c9695a,color:#8f3e34,stroke-width:2px;`;
}

export function buildFallbackReport(scan: SiteScanResult): VisibilityReport {
  const baseScore =
    38 +
    scan.facts.pagesWithUseCases * 10 +
    scan.facts.pagesWithPricing * 9 +
    scan.facts.pagesWithProof * 8 +
    scan.facts.pagesWithSchema * 6 +
    scan.facts.pagesWithActions * 6 -
    scan.facts.pagesWithThinContent * 6 -
    Math.max(0, 2 - scan.facts.pagesAnalyzed) * 10;

  const visibilityScore = clamp(baseScore, 18, 96);
  const websiteContextArtifact = buildWebsiteContextArtifact(scan);
  const llmPerceptionArtifact = buildLLMPerceptionArtifact(scan, websiteContextArtifact);
  const agentVisitorArtifact = buildAgentVisitorArtifact(scan);
  const aioArtifact = buildAioArtifact(scan);
  const citationArtifact = buildCitationArtifact(scan);
  const topFixes = buildTopFixes(scan);
  const fixPrioritizationArtifact = buildFixPrioritizationArtifact(scan, topFixes);
  const fixPack = buildFixPack(scan, websiteContextArtifact, citationArtifact);
  const beforeAfterPerception = buildBeforeAfterPerception(scan, llmPerceptionArtifact, websiteContextArtifact, fixPack);
  const inferredCompetitiveContext = buildInferredCompetitiveContext(scan, websiteContextArtifact);
  const machineFacingGtmRisks = buildMachineFacingGtmRisks(scan, websiteContextArtifact);
  const geminiOrchestrationSummary = buildGeminiOrchestrationSummary();
  const receipts = fallbackReceipts(scan);

  return {
    visibilityScore,
    scoreLabel: scoreLabel(visibilityScore),
    executiveVerdict:
      scan.pages.length === 0
        ? "Evidence is limited because the site could not be fetched cleanly from this environment, so this brief is directional at best."
        : sentence(
            visibilityScore >= 76
              ? `Public signals suggest ${safeCompanyName(scan)} already has a strong machine-readable baseline, but category framing, proof packaging, and buyer routing can still be tightened for higher-confidence AI interpretation and citation`
              : visibilityScore >= 60
                ? `Public signals suggest ${safeCompanyName(scan)} is directionally understandable for AI search, LLM summaries, and agent visitors, but the site still needs stronger machine-facing support around proof, action paths, and structured clarity`
                : `Public signals suggest ${safeCompanyName(scan)} is still hard for machines to interpret cleanly, especially around category clarity, proof, and next-step routing`,
          ),
    websiteContextArtifact,
    llmPerceptionArtifact,
    agentVisitorArtifact,
    aioArtifact,
    citationArtifact,
    fixPrioritizationArtifact,
    fixPack,
    beforeAfterPerception,
    inferredCompetitiveContext,
    machineFacingGtmRisks,
    geminiOrchestrationSummary,
    llmPerception: {
      likelySummary: truncate(llmPerceptionArtifact.likelySummary, 420),
      positioningClarity: truncate(llmPerceptionArtifact.positioningInterpretation, 260),
      possibleMisreadings: llmPerceptionArtifact.possibleMisreadings,
    },
    agentReadiness: {
      whatAgentsCanUnderstand: agentVisitorArtifact.whatAgentsCanUnderstand,
      whatAgentsMaySkip: agentVisitorArtifact.journeyBlockers,
      actionabilityGaps: agentVisitorArtifact.actionabilityGaps,
    },
    aioReadiness: {
      answerEngineFit: sentence(first(aioArtifact.answerEngineObservations) || "Answer-engine readiness is only partial from the available public signals"),
      citationReadiness: sentence(first(citationArtifact.proofGaps) || first(citationArtifact.strongClaims) || "Citation readiness remains directional from the bounded public evidence"),
      structuredDataGaps: aioArtifact.contentStructureIssues,
    },
    humanVsAgent: {
      humanPersuasionStrengths: [
        "The site likely communicates more trust visually than a raw HTML extraction alone can capture.",
        "Brand tone and page design may help human readers even where machine-readable clarity is still thin.",
      ],
      agentReadableLogicGaps: [
        "Machines need plainer category, audience, proof, and next-step logic in rendered text.",
        "Important business context may still be implied by design instead of directly stated.",
      ],
    },
    journeyDiagram: {
      mermaid: buildFallbackMermaid(scan),
      summary: "The strongest path is from homepage recognition into basic product understanding. The weakest transitions are usually proof, pricing, and action clarity.",
    },
    topFixes,
    evidenceReceipts: receipts,
    limitations: truncate(buildUserFacingLimitations(), 400),
    competitorOrCategoryPositioning:
      inferredCompetitiveContext.competitivePerceptionGap,
    agentShopperBlockers: agentVisitorArtifact.journeyBlockers,
  };
}

export function buildArtifactPreview(report: VisibilityReport, agentId: WorkflowAgentId): AgentArtifactPreview {
  switch (agentId) {
    case "website-context":
      return {
        title: "Site facts captured",
        lead: titleLead(report.websiteContextArtifact.mainOffering, "Main offering captured."),
        bullets: takeNonEmpty(
          [
            report.websiteContextArtifact.companyCategory,
            report.websiteContextArtifact.likelyAudience,
            report.websiteContextArtifact.keyPagesFound[0] ? `Key page: ${report.websiteContextArtifact.keyPagesFound[0]}` : undefined,
            report.websiteContextArtifact.missingBasics[0],
          ],
          3,
        ),
      };
    case "llm-perception":
      return {
        title: "Likely machine summary",
        lead: titleLead(report.llmPerceptionArtifact.likelySummary, "Directional summary captured."),
        bullets: takeNonEmpty(
          [
            report.llmPerceptionArtifact.positioningInterpretation,
            report.llmPerceptionArtifact.possibleMisreadings[0],
            report.llmPerceptionArtifact.possibleMisreadings[1],
          ],
          3,
        ),
      };
    case "agent-visitor":
      return {
        title: "Agent shopper journey blockers",
        lead: titleLead(report.agentVisitorArtifact.journeyBlockers[0] || report.agentVisitorArtifact.whatAgentsCanUnderstand[0] || "Journey artifact ready.", "Journey artifact ready."),
        bullets: takeNonEmpty(
          [
            report.agentVisitorArtifact.whatAgentsCanUnderstand[0],
            report.agentVisitorArtifact.journeyBlockers[0],
            report.agentVisitorArtifact.actionabilityGaps[0],
          ],
          3,
        ),
      };
    case "aio-answer-engine":
      return {
        title: "Answer-engine readiness findings",
        lead: titleLead(report.aioArtifact.answerEngineObservations[0] || report.aioReadiness.answerEngineFit, "Answer-engine findings ready."),
        bullets: takeNonEmpty(
          [
            report.aioArtifact.strengths[0],
            report.aioArtifact.weaknesses[0],
            report.aioArtifact.contentStructureIssues[0],
          ],
          3,
        ),
      };
    case "citation-readiness":
      return {
        title: "Evidence and proof gaps",
        lead: titleLead(report.citationArtifact.strongClaims[0] || report.aioReadiness.citationReadiness, "Citation review ready."),
        bullets: takeNonEmpty(
          [
            report.citationArtifact.weakClaims[0],
            report.citationArtifact.proofGaps[0],
            report.citationArtifact.trustGaps[0],
          ],
          3,
        ),
      };
    case "fix-prioritization":
      return {
        title: "Fix Pack + top 5 actions",
        lead: titleLead(report.fixPrioritizationArtifact.firstWeekFocus, "Fix priority set."),
        bullets: takeNonEmpty(
          [
            report.fixPrioritizationArtifact.topActions[0]
              ? `#1 ${report.fixPrioritizationArtifact.topActions[0].action}`
              : undefined,
            report.fixPrioritizationArtifact.fixPackSummary[0],
            report.fixPrioritizationArtifact.fixPackSummary[1],
          ],
          3,
        ),
      };
  }
}

export function buildWorkflowTrace(report: VisibilityReport, evidenceCount: number): WorkflowTraceItem[] {
  const pageTypes = dedupe(
    report.websiteContextArtifact.keyPagesFound
      .map((item) => item.match(/\(([^)]+)\)$/)?.[1])
      .filter(Boolean),
  )
    .slice(0, 4)
    .join(", ");

  return [
    {
      id: "website-context",
      label: AGENT_LABELS["website-context"],
      status: evidenceCount ? "completed" : "blocked",
      summary: evidenceCount
        ? sentence(`Captured ${evidenceCount} public pages and identified ${report.websiteContextArtifact.companyCategory.replace(/\.$/, "").toLowerCase()}, ${pageTypes || "core"}, proof, and action-path signals`)
        : "Could not extract enough public evidence from this environment.",
      evidenceCount,
      artifactPreview: evidenceCount ? buildArtifactPreview(report, "website-context") : undefined,
    },
    {
      id: "llm-perception",
      label: AGENT_LABELS["llm-perception"],
      status: evidenceCount ? "completed" : "blocked",
      summary: "Modeled likely machine summary and category interpretation from public evidence.",
      evidenceCount,
      artifactPreview: evidenceCount ? buildArtifactPreview(report, "llm-perception") : undefined,
    },
    {
      id: "agent-visitor",
      label: AGENT_LABELS["agent-visitor"],
      status: evidenceCount ? "completed" : "blocked",
      summary: "Assessed buyer routing, evaluation clarity, and next-step action signals for agent visitors.",
      evidenceCount,
      artifactPreview: evidenceCount ? buildArtifactPreview(report, "agent-visitor") : undefined,
    },
    {
      id: "aio-answer-engine",
      label: AGENT_LABELS["aio-answer-engine"],
      status: evidenceCount ? "completed" : "blocked",
      summary: "Reviewed answer-engine reuse, content structure, and machine-readable positioning cues.",
      evidenceCount,
      artifactPreview: evidenceCount ? buildArtifactPreview(report, "aio-answer-engine") : undefined,
    },
    {
      id: "citation-readiness",
      label: AGENT_LABELS["citation-readiness"],
      status: evidenceCount ? "completed" : "blocked",
      summary: "Checked whether claims, proof, and trust cues are packaged cleanly enough for citation.",
      evidenceCount,
      artifactPreview: evidenceCount ? buildArtifactPreview(report, "citation-readiness") : undefined,
    },
    {
      id: "fix-prioritization",
      label: AGENT_LABELS["fix-prioritization"],
      status: evidenceCount ? "completed" : "blocked",
      summary: report.fixPrioritizationArtifact.topActions[0]
        ? "Converted the findings into a distinct first-week action plan and Fix Pack."
        : "No fixes could be prioritized from the available evidence.",
      evidenceCount,
      artifactPreview: evidenceCount ? buildArtifactPreview(report, "fix-prioritization") : undefined,
    },
  ];
}

export function buildCompletionEvent(
  report: VisibilityReport,
  agentId: WorkflowAgentId,
  evidenceCount: number,
): ProgressEvent {
  const workflowItem = buildWorkflowTrace(report, evidenceCount).find((item) => item.id === agentId);

  return {
    agentId,
    status: evidenceCount ? "completed" : "blocked",
    message: workflowItem?.summary || "Artifact ready.",
    evidenceCount,
    artifactPreview: workflowItem?.artifactPreview,
  };
}
