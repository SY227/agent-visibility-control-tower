import type { SiteScanResult } from "@/lib/types";

export function buildVisibilityPrompt(scan: SiteScanResult) {
  const pageSummaries = scan.pages
    .map((page, index) => {
      return [
        `Source ${index + 1}`,
        `URL: ${page.url}`,
        `Page type: ${page.pageType}`,
        `Title: ${page.title || "None"}`,
        `Meta description: ${page.metaDescription || "None"}`,
        `H1: ${page.h1 || "None"}`,
        `Headings: ${page.headings.slice(0, 8).join(" | ") || "None"}`,
        `Schema types: ${page.schemaTypes.join(" | ") || "None"}`,
        `Pricing signals: ${page.pricingSignals.join(" | ") || "None"}`,
        `Proof signals: ${page.proofSignals.join(" | ") || "None"}`,
        `Trust signals: ${page.trustSignals.join(" | ") || "None"}`,
        `Use-case signals: ${page.useCaseSignals.join(" | ") || "None"}`,
        `Action signals: ${page.actionSignals.join(" | ") || "None"}`,
        `Citation signals: ${page.citationSignals.join(" | ") || "None"}`,
        `Snippet: ${page.snippet || "None"}`,
        `Body text: ${page.bodyText || "None"}`,
      ].join("\n");
    })
    .join("\n\n");

  const evidenceCatalog = scan.evidenceReceipts
    .map(
      (receipt, index) =>
        `${index + 1}. ${receipt.sourceName} | ${receipt.sourceUrl} | ${receipt.signal} | ${receipt.snippet}`,
    )
    .join("\n");

  return `You are producing an enterprise-ready AI Visibility Readiness Brief for Agent Visibility Control Tower.

Product framing:
- Product name: Agent Visibility Control Tower.
- Agent Visibility Control Tower helps enterprises inspect and repair the machine-facing GTM layer, how AI agents, LLMs, and answer engines understand, cite, route, or skip a company before a human buyer ever clicks.
- This is machine-facing GTM infrastructure, not a generic SEO audit.
- Core promise: one URL in -> AI Visibility Readiness Brief + visible agent artifacts + Fix Pack + Before / After AI Perception Simulator.
- Position the workflow as a bounded Gemini agent workflow with six specialized stages, each with a defined job and visible artifact.
- The workflow label is Agent Workflow Trace, not thinking trace.

Core rules:
- Use only the public evidence provided below.
- Never invent sources, URLs, snippets, pricing, customers, proof, or claims.
- Never claim certainty about ranking, citation, indexing, competitor status, or closed-model behavior.
- Use careful language such as "public signals suggest", "the site appears likely to", "likely", "inferred from public site signals", "directional competitive context", "not a verified market map", "directional simulation", and "projected improvement".
- Do not expose chain-of-thought.
- Do not fake full autonomy, autonomous swarms, or hidden reasoning. Enterprise reliability, latency, evidence constraints, and inspectable outputs matter more than performative autonomy.
- Keep the tone crisp, premium, executive-readable, and trustworthy.
- If evidence is limited, say so directly.
- The Mermaid diagram must reflect the actual observed analysis, not generic decoration.
- For evidenceReceipts, sourceUrl must exactly match one of the provided URLs.
- topFixes must be exactly 5 items.
- fixPrioritizationArtifact.topActions must be exactly 5 items.
- fixPack.faqBlock must be exactly 5 items.
- The Fix Pack should feel like repair outputs for the machine-facing GTM layer, not generic advice.
- The before/after simulator must be explicitly directional and non-guaranteed.
- Do not invent competitors, peer rankings, sources, citations, or market maps.
- Any competitive context must stay directional, confidence-labeled, and inferred only from the public site signals in this scan.
- Return strict JSON only. No markdown fences, no prose before the JSON object, and no trailing commentary.
- Do not use homepage CTA copy, promo slogans, or raw navigation text as the company category.
- Reject snippets that look like merged menu text, repeated navigation labels, or cookie/banner copy.
- topFixes and fixPrioritizationArtifact.topActions must be distinct. Never repeat the same action with slightly different wording.
- If the site baseline is already strong, say so. Recommend refinement and packaging improvements, not emergency-repair language.

Required output artifact name: AI Visibility Readiness Brief.

Scoring guidance:
- 0-40 Weak
- 41-60 Emerging
- 61-75 Mixed
- 76-89 Strong
- 90-100 Excellent

Allowed source URLs:
${scan.pages.map((page) => `- ${page.url}`).join("\n")}

Observed crawl facts:
${JSON.stringify(scan.facts, null, 2)}

Crawl limitations:
${scan.limitations.length ? scan.limitations.map((item) => `- ${item}`).join("\n") : "- No major crawl limitations observed in this bounded pass."}

Evidence catalog:
${evidenceCatalog || "None"}

Public page summaries:
${pageSummaries}

Generate a concise but specific structured brief covering:
- how machines may summarize the company today
- what each of the six agents would visibly produce as a compact artifact
- machine-facing GTM risks
- inferred competitive context from public site signals only
- what AI agents and answer engines can understand, skip, or misread
- answer-engine readiness and content structure issues
- citation readiness, trust, and evidence gaps
- a Fix Pack with paste-ready homepage summary, 5 FAQ items, citation-ready proof block, action-path copy, and a schema plan
- a directional Before / After AI Perception Simulator
- a bounded Gemini orchestration summary without chain-of-thought
- top 5 fixes this week
- evidence receipts
- limitations

Artifact requirements:
1. websiteContextArtifact -> title implied: Site facts captured
   Include company/category summary, likely audience, main offering, key visible pages found, strongest proof signals found, major missing basics.
2. llmPerceptionArtifact -> title implied: Likely machine summary
   Include likely one-paragraph LLM summary, likely positioning interpretation, likely confusion or misreadings.
3. agentVisitorArtifact -> title implied: Agent shopper journey blockers
   Include what an AI agent can understand, what blocks actionability, whether pricing/proof/next-step path are clear, and buyer path gaps.
4. aioArtifact -> title implied: Answer-engine readiness findings
   Include likely strengths, weaknesses, answer-surface observations, and content structure issues.
5. citationArtifact -> title implied: Evidence and proof gaps
   Include strong claims, weak claims, proof gaps, and trust or evidence gaps.
6. fixPrioritizationArtifact -> title implied: Fix Pack + top 5 actions
   Include the top 5 actions ranked by impact and effort, a compact Fix Pack summary, and what to do first this week.

Additional section requirements:
7. inferredCompetitiveContext
   - inferredCategory should be a concise, noun-based category inferred from public site signals.
   - Never use CTA language, slogans, or promotional copy as inferredCategory.
   - categoryConfidence must be High, Medium, or Low.
   - likelyPeerSet must contain 3 to 5 directional peer archetypes or likely peer descriptions inferred from public site signals only, not verified competitors.
   - likelyPeerSet names should be short strategic archetypes, not malformed category strings.
   - Each likelyPeerSet item needs name, confidence, and whyInferred.
   - competitivePerceptionGap should explain how the site may be perceived versus better-packaged peers in the same likely category.
   - categoryVisibilityRisk should explain the machine-facing GTM risk of weak category legibility.
   - differentiationNotes should stay concrete and machine-facing.
   - validationNote must explicitly say this is directional competitive context, inferred from public site signals, and not a verified market map.
8. machineFacingGtmRisks
   - Must contain exactly these five riskName values: Misclassification Risk, Citation Weakness Risk, Agent Journey Blocker, Buyer Routing Risk, Trust Gap.
   - Each risk needs severity, whyItMatters, and suggestedFix.
   - Keep tone enterprise GTM oriented, not security scare language.
9. geminiOrchestrationSummary
   - Present this as a bounded Gemini orchestration summary.
   - Include an overview plus six steps.
   - Each step needs agentName, job, and outputArtifact.
   - Do not reveal chain-of-thought, hidden reasoning, or thinking trace.

Fix Pack requirements:
- homepageSummaryBlock should read like paste-ready homepage copy that improves machine readability.
- faqBlock should be concise and answer-engine friendly.
- Do not produce awkward audience phrases such as malformed fragments or stitched heading text.
- citationReadyProofBlock should upgrade vague claims into more citeable proof language without inventing facts.
- agentActionPathCopy should cover pricing path, demo/request path, enterprise evaluation path, and docs path if relevant.
- schemaPlan should recommend practical schema types such as Organization, Product, FAQ, SoftwareApplication, Breadcrumb, and Review/AggregateRating only where supportable.

Before / After AI Perception Simulator requirements:
- currentLikelySummary: based on the current public site content.
- improvedLikelySummary: based on the proposed Fix Pack and content improvements.
- whatChanged: list concise directional improvements such as clearer category, audience, proof, action path, machine readability, and citation support.
- Do not claim guaranteed ranking lift, guaranteed citation outcomes, or definite future behavior.

The Mermaid diagram should use flowchart LR and show a realistic path like:
Company URL -> Homepage -> Product clarity -> Proof/citations -> Pricing/action path -> AI answer or agent recommendation.
Use class definitions or styles so strong states appear green, partial states amber, and blocked states red.`;
}
