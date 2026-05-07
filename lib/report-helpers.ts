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

export function safeCompanyName(scan: SiteScanResult) {
  const title = first(scan.pages)?.title ?? "the company";
  const fragment = title.split(/[|\-–:]/)[0]?.trim();
  if (fragment && fragment.length <= 48) return fragment;
  return scan.normalizedUrl.replace(/^https?:\/\//i, "");
}

function inferAudience(scan: SiteScanResult) {
  const pageSignals = scan.pages.flatMap((page) => page.useCaseSignals);
  const matched = pageSignals.find((signal) => /for\s+[a-z0-9 ,/&-]+/i.test(signal));
  if (matched) {
    const capture = matched.match(/for\s+([a-z0-9 ,/&-]+)/i)?.[1];
    if (capture) return sentence(`Likely audience: ${truncate(capture, 90)}`);
  }

  if (scan.facts.pagesWithUseCases > 0) {
    return "Likely audience appears to be a defined business buyer or operator segment, but the role-based copy still needs to be plainer.";
  }

  return "Likely audience is only partly explicit on the public site, which increases the risk of generic machine summaries.";
}

function inferCompanyCategory(scan: SiteScanResult) {
  const homepage = first(scan.pages);
  const productPage = pickPage(scan, "product") || pickPage(scan, "use-cases");
  const source = firstNonEmpty([
    homepage?.metaDescription,
    homepage?.h1,
    productPage?.h1,
    productPage?.metaDescription,
    homepage?.title,
  ]);

  return ensureNarrativeLength(
    truncate(source, 180),
    16,
    "Public signals suggest a digital product or service business, but category language is still too thin for a crisp machine classification.",
    "Public site signals are limited in this bounded pass, so this category read remains directional.",
  );
}

function inferMainOffering(scan: SiteScanResult) {
  const homepage = first(scan.pages);
  const productPage = pickPage(scan, "product") || pickPage(scan, "pricing") || pickPage(scan, "use-cases");
  const offering = firstNonEmpty([
    productPage?.metaDescription,
    productPage?.h1,
    homepage?.metaDescription,
    homepage?.h1,
  ]);

  return ensureNarrativeLength(
    truncate(offering, 200),
    16,
    "The main offering is still only partly understandable from the bounded public pages captured in this run.",
    "Public site signals are limited, so the offering still needs clearer machine-readable explanation.",
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
      page.proofSignals[0],
      page.trustSignals[0],
      page.citationSignals[0],
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

export function buildTopFixes(scan: SiteScanResult): TopFix[] {
  const fixes: TopFix[] = [];

  if (scan.facts.pagesWithUseCases === 0) {
    fixes.push({
      fix: "Add one plain-English homepage block that states category, audience, and workflow outcome.",
      whyItMatters: "Machines need the company, buyer, and use case to be obvious in rendered text before they can summarize or route intent well.",
      impact: "High",
      effort: "Low",
    });
  }
  if (scan.facts.pagesWithPricing === 0) {
    fixes.push({
      fix: "Expose pricing logic, plans, or commercial packaging in public copy.",
      whyItMatters: "AI agents often stall when they cannot infer whether there is a self-serve, sales-led, or enterprise buying path.",
      impact: "High",
      effort: "Medium",
    });
  }
  if (scan.facts.pagesWithProof === 0) {
    fixes.push({
      fix: "Pair the primary claims with visible proof, outcomes, or customer credibility markers.",
      whyItMatters: "Answer engines and machine-mediated buyers are more likely to trust claims that have nearby evidence.",
      impact: "High",
      effort: "Medium",
    });
  }
  if (scan.facts.pagesWithActions <= 1) {
    fixes.push({
      fix: "Create a cleaner buyer action path across homepage, product, and pricing surfaces.",
      whyItMatters: "Understanding alone is not enough if a machine still cannot determine the correct next action for a buyer.",
      impact: "High",
      effort: "Low",
    });
  }
  if (scan.facts.pagesWithSchema === 0) {
    fixes.push({
      fix: "Add lightweight schema to the core company, product, and FAQ surfaces.",
      whyItMatters: "Structured reinforcement can reduce ambiguity around the organization, product, and offer model.",
      impact: "Medium",
      effort: "Low",
    });
  }
  if (scan.facts.pagesWithThinContent > 0) {
    fixes.push({
      fix: "Increase explanatory text on thin pages so key buyer logic is extractable without visual context.",
      whyItMatters: "Machines cannot reliably infer the missing logic that human readers may pick up from layout or design alone.",
      impact: "Medium",
      effort: "Medium",
    });
  }

  while (fixes.length < 5) {
    fixes.push({
      fix: "Tighten core page copy so the value proposition is explicit in one short scan.",
      whyItMatters: "Clearer rendered copy generally improves both human comprehension and machine-side interpretation.",
      impact: "Medium",
      effort: "Low",
    });
  }

  return fixes.slice(0, 5);
}

export function buildLLMPerceptionArtifact(
  scan: SiteScanResult,
  websiteContextArtifact = buildWebsiteContextArtifact(scan),
): LLMPerceptionArtifact {
  const summarySource = firstNonEmpty([
    pickPage(scan, "homepage")?.metaDescription,
    pickPage(scan, "homepage")?.h1,
    pickPage(scan, "product")?.metaDescription,
  ]);

  return {
    likelySummary: ensureNarrativeLength(
      truncate(summarySource, 260),
      24,
      `${safeCompanyName(scan)} appears to have a real public web presence, but the company and offering still risk being summarized too generically by LLMs.`,
      "Public site evidence is sparse, so this likely machine summary remains directional and incomplete.",
    ),
    positioningInterpretation:
      scan.facts.pagesWithUseCases > 0
        ? sentence(`Public signals suggest the company will likely be interpreted as ${truncate(websiteContextArtifact.companyCategory, 150)}`)
        : "The likely positioning interpretation is directionally understandable, but category language is still loose enough to invite flattening or over-generalization.",
    possibleMisreadings: takeNonEmpty(
      [
        scan.facts.pagesWithUseCases === 0
          ? "The company may be described too broadly because audience and workflow language are still implied instead of stated plainly."
          : "The company may still be flattened into a broader category if differentiation is not repeated across core pages.",
        scan.facts.pagesWithPricing === 0
          ? "An LLM may miss the commercial motion because pricing and packaging remain unclear on public pages."
          : "An LLM may understate the buying motion if pricing context is separated from product proof.",
        scan.facts.pagesWithProof === 0
          ? "Claims may be repeated without enough proof context, which lowers confidence in a machine-generated summary."
          : "Proof signals exist, but they may not be packaged tightly enough to anchor a reliable machine summary.",
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
  const offering = truncate(websiteContextArtifact.mainOffering.replace(/\.$/, ""), 150);
  const proof = truncate(first(citationArtifact.strongClaims) || "Add one verified proof statement near the primary claim", 140);

  return sentence(
    `${company} should describe itself in one plain-language block that states the category, the primary audience${audience ? ` (${audience})` : ""}, and the main offering. Recommended core message: ${offering}. Support the primary claim with visible proof such as ${proof}. End the section with a clear next step, for example reviewing plans, requesting a demo, or starting an enterprise evaluation`,
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
      answer: sentence(`${company} is presented as ${category.toLowerCase()}, with public pages that point to ${offering.toLowerCase()}`),
    },
    {
      question: `Who is ${company} for?`,
      answer: sentence(audience || "The site should state the primary buyer, operator, or team segment in one plain-language sentence."),
    },
    {
      question: `What problem does ${company} help solve?`,
      answer: sentence(
        scan.facts.pagesWithUseCases > 0
          ? "The public copy should tie the product to one or two clear workflows so answer engines can map the company to a buyer problem quickly"
          : "The site should add a short workflow-oriented explanation that states the buyer problem, the product role, and the expected outcome",
      ),
    },
    {
      question: `What proof should a buyer or machine see?`,
      answer: sentence(
        scan.facts.pagesWithProof > 0
          ? "Keep customer outcomes, trust markers, or measured results close to the main value claims so they are easy to cite directionally"
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
    .slice(0, 2)
    .map((claim) => truncate(sentence(`Keep and tighten this claim with a visible source, metric, or named proof: ${claim}`), 260));
  const gapDriven = citationArtifact.proofGaps
    .slice(0, 2)
    .map((gap) => truncate(sentence(`Add a citeable version in this format: ${gap}`), 260));
  const commercial = scan.facts.pagesWithPricing === 0
    ? [truncate("Add a public commercial qualifier such as plan ranges, implementation scope, or enterprise evaluation criteria so machine-mediated buyers can understand the buying motion.", 260)]
    : [truncate("Link proof statements to the relevant pricing or evaluation path so the buyer journey is easier for agents to interpret.", 260)];

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
  return {
    topActions: topFixes.map((fix) => ({
      action: fix.fix,
      impact: fix.impact,
      effort: fix.effort,
      whyItMatters: fix.whyItMatters,
    })),
    fixPackSummary: [
      "Paste-ready homepage summary block for clearer machine-readable positioning.",
      "Five concise answer-engine FAQ items to anchor category, audience, proof, and next steps.",
      "Citation-ready proof statements and a practical schema plan for the highest-signal pages.",
      "Action-path copy for pricing, demo, enterprise evaluation, and docs routing.",
    ],
    firstWeekFocus: sentence(topFixes[0]?.fix || "Start with the highest-impact homepage clarity fix this week"),
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
  const normalized = value.replace(/\.$/, "").trim();
  if (!normalized) return "category-adjacent";
  return truncate(normalized.replace(/^Public signals suggest\s+/i, ""), 72);
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
      name: `${categoryLabel} vendors with explicit category framing`,
      confidence: categoryConfidence,
      whyInferred: sentence(
        `Likely inferred from public site signals that point to ${categoryLabel.toLowerCase()} positioning and a need for clearer category language`,
      ),
    },
    {
      name: `${categoryLabel} vendors with stronger proof packaging`,
      confidence: (scan.facts.pagesWithProof > 0 ? "Medium" : "High") as ConfidenceLevel,
      whyInferred: sentence(
        `Likely inferred from public site signals showing the product story is present, but proof density and citation support still shape how peers may be perceived`,
      ),
    },
    {
      name: `${categoryLabel} vendors with clearer buyer routing`,
      confidence: (scan.facts.pagesWithActions > 1 ? "Medium" : "High") as ConfidenceLevel,
      whyInferred: sentence(
        `Likely inferred from public site signals around how directly the site guides ${audience.toLowerCase()} into pricing, demo, or evaluation next steps`,
      ),
    },
    {
      name: `${categoryLabel} vendors with stronger answer-surface structure`,
      confidence: (scan.facts.pagesWithSchema > 0 ? "Medium" : "High") as ConfidenceLevel,
      whyInferred: sentence(
        `Likely inferred from public site signals about structured data, repeated category wording, and how easily answer engines can reuse the site narrative`,
      ),
    },
  ].slice(0, scan.facts.pagesWithSchema > 0 ? 4 : 3);

  return {
    inferredCategory: sentence(
      `Likely category inferred from public site signals: ${categoryLabel}`,
    ),
    categoryConfidence,
    likelyPeerSet,
    competitivePerceptionGap: sentence(
      scan.facts.pagesWithUseCases > 0
        ? `The site appears likely to belong in this category, but its machine-facing differentiation is thinner than the strongest peer-shaped narratives AI systems usually compress into summaries`
        : `The site appears likely to fit a real market category, but category language is still loose enough that AI systems may flatten it into a generic software or service label`,
    ),
    categoryVisibilityRisk: sentence(
      scan.facts.pagesWithProof > 0 && scan.facts.pagesWithActions > 1
        ? "Category visibility risk looks moderate because the company is directionally legible, but proof, buyer routing, or repeated machine-readable cues still need tighter packaging"
        : "Category visibility risk looks elevated because a machine may understand that the company exists without confidently understanding why it is distinct, citeable, or easy to route",
    ),
    differentiationNotes: [
      sentence("Use category language consistently across homepage, product, and commercial pages so machine summaries do not drift"),
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
      snippet: truncate(page.snippet || page.metaDescription || page.h1 || page.title, 220),
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
            `Public signals suggest ${safeCompanyName(scan)} is ${visibilityScore >= 76 ? "fairly understandable" : visibilityScore >= 60 ? "partly understandable" : "still hard to interpret cleanly"} for AI search, LLM summaries, and agent visitors, but the site still needs stronger machine-facing support around proof, action paths, and structured clarity`,
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
      likelySummary: llmPerceptionArtifact.likelySummary,
      positioningClarity: llmPerceptionArtifact.positioningInterpretation,
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
    limitations: truncate(
      sentence(
        scan.limitations.length
          ? scan.limitations.join(" ")
          : "This is a directional public-page read, not a formal SEO audit or guaranteed LLM ranking result",
      ),
      400,
    ),
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
  return [
    {
      id: "website-context",
      label: AGENT_LABELS["website-context"],
      status: evidenceCount ? "completed" : "blocked",
      summary: evidenceCount
        ? `${report.websiteContextArtifact.companyCategory} ${report.websiteContextArtifact.mainOffering}`
        : "Could not extract enough public evidence from this environment.",
      evidenceCount,
      artifactPreview: evidenceCount ? buildArtifactPreview(report, "website-context") : undefined,
    },
    {
      id: "llm-perception",
      label: AGENT_LABELS["llm-perception"],
      status: evidenceCount ? "completed" : "blocked",
      summary: report.llmPerceptionArtifact.positioningInterpretation,
      evidenceCount,
      artifactPreview: evidenceCount ? buildArtifactPreview(report, "llm-perception") : undefined,
    },
    {
      id: "agent-visitor",
      label: AGENT_LABELS["agent-visitor"],
      status: evidenceCount ? "completed" : "blocked",
      summary: report.agentVisitorArtifact.journeyBlockers[0] || report.agentVisitorArtifact.whatAgentsCanUnderstand[0],
      evidenceCount,
      artifactPreview: evidenceCount ? buildArtifactPreview(report, "agent-visitor") : undefined,
    },
    {
      id: "aio-answer-engine",
      label: AGENT_LABELS["aio-answer-engine"],
      status: evidenceCount ? "completed" : "blocked",
      summary: report.aioArtifact.answerEngineObservations[0] || report.aioReadiness.answerEngineFit,
      evidenceCount,
      artifactPreview: evidenceCount ? buildArtifactPreview(report, "aio-answer-engine") : undefined,
    },
    {
      id: "citation-readiness",
      label: AGENT_LABELS["citation-readiness"],
      status: evidenceCount ? "completed" : "blocked",
      summary: report.citationArtifact.proofGaps[0] || report.aioReadiness.citationReadiness,
      evidenceCount,
      artifactPreview: evidenceCount ? buildArtifactPreview(report, "citation-readiness") : undefined,
    },
    {
      id: "fix-prioritization",
      label: AGENT_LABELS["fix-prioritization"],
      status: evidenceCount ? "completed" : "blocked",
      summary:
        report.fixPrioritizationArtifact.topActions[0]?.action ||
        "No fixes could be prioritized from the available evidence.",
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
