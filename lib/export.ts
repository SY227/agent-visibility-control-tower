import {
  buildContentTeamCopy,
  buildEngineeringCopy,
  buildExecutiveSummaryCopy,
  buildGtmRiskSummaryCopy,
} from "@/lib/handoff-copy";
import type { MachineFacingGtmRisk, VisibilityReport } from "@/lib/types";

const severityOrder: Record<MachineFacingGtmRisk["severity"], number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

function section(title: string, lines: string[]) {
  return [`## ${title}`, ...lines, ""].join("\n");
}

function topRisk(report: VisibilityReport) {
  return [...report.machineFacingGtmRisks].sort(
    (left, right) => severityOrder[right.severity] - severityOrder[left.severity],
  )[0];
}

function pickOwner(report: VisibilityReport) {
  const source = `${report.fixPrioritizationArtifact.firstWeekFocus} ${report.topFixes[0]?.fix || ""}`.toLowerCase();

  if (/schema|structured data|docs|implementation|engineering|technical/.test(source)) return "Engineering";
  if (/pricing|package|commercial|evaluation|demo|procurement|revops/.test(source)) return "RevOps";
  if (/route|routing|journey|buyer path|growth|gtm/.test(source)) return "Growth";
  if (/homepage|copy|faq|proof|content|category|audience|positioning/.test(source)) return "Content";
  if (report.visibilityScore <= 45) return "Executive Review";
  return "Growth";
}

export function buildMarkdownBrief(report: VisibilityReport) {
  const gtmRiskSummary = buildGtmRiskSummaryCopy(report);
  const primaryRisk = topRisk(report);
  const topGap =
    report.agentVisitorArtifact.journeyBlockers[0] ||
    report.agentShopperBlockers[0] ||
    report.topFixes[0]?.fix ||
    "Machines may still struggle to determine the next buyer action from the public site.";

  return [
    `# AI Visibility Readiness Brief`,
    "",
    `**AI Visibility Score:** ${report.visibilityScore} / 100 (${report.scoreLabel})`,
    "",
    section("Executive Verdict", [report.executiveVerdict]),
    section("Boardroom Snapshot", [
      `- Enterprise Risk: ${primaryRisk ? `${primaryRisk.riskName} (${primaryRisk.severity}) -> ${primaryRisk.whyItMatters}` : report.executiveVerdict}`,
      `- Business Consequence: ${report.topFixes[0]?.whyItMatters || report.inferredCompetitiveContext.categoryVisibilityRisk}`,
      `- First-Week Move: ${report.fixPrioritizationArtifact.firstWeekFocus || report.topFixes[0]?.fix}`,
    ]),
    section("Score Cards", [
      `- AI Visibility Score: ${report.visibilityScore}/100 (${report.scoreLabel})`,
      `- Citation Readiness: ${report.aioReadiness.citationReadiness}`,
      `- Agent Actionability: ${report.agentReadiness.actionabilityGaps[0] || "Action paths look relatively clear in the bounded crawl."}`,
    ]),
    section("Decision Memo", [
      `- Current posture: ${report.scoreLabel}`,
      `- Primary risk: ${primaryRisk ? `${primaryRisk.riskName} (${primaryRisk.severity})` : topGap}`,
      `- Recommended action: ${report.fixPrioritizationArtifact.firstWeekFocus || report.topFixes[0]?.fix}`,
      `- Suggested owner: ${pickOwner(report)}`,
      `- Time horizon: This week`,
    ]),
    section("Top Machine-Facing Gap", [topGap, report.topFixes[0]?.whyItMatters || "This is the clearest blocker currently standing between public understanding and machine-mediated action."]),
    section("Machine-Facing GTM Risks", report.machineFacingGtmRisks.map((risk) => `- **${risk.riskName}** (${risk.severity})\n  - Why it matters: ${risk.whyItMatters}\n  - Suggested fix: ${risk.suggestedFix}`)),
    section("Inferred Competitive Context", [
      `- Inferred category: ${report.inferredCompetitiveContext.inferredCategory}`,
      `- Category confidence: ${report.inferredCompetitiveContext.categoryConfidence}`,
      ...report.inferredCompetitiveContext.likelyPeerSet.map(
        (item) => `- Likely peer: ${item.name} (${item.confidence}) -> ${item.whyInferred}`,
      ),
      `- Competitive perception gap: ${report.inferredCompetitiveContext.competitivePerceptionGap}`,
      `- Category visibility risk: ${report.inferredCompetitiveContext.categoryVisibilityRisk}`,
      ...report.inferredCompetitiveContext.differentiationNotes.map((item) => `- Differentiation note: ${item}`),
      `- Validation note: ${report.inferredCompetitiveContext.validationNote}`,
    ]),
    section("Fix Pack", [
      `### What to do first this week`,
      report.fixPrioritizationArtifact.firstWeekFocus,
      "",
      `### Handoff-Ready Workstreams`,
      `#### Executive Review`,
      buildExecutiveSummaryCopy(report),
      "",
      `#### Content Team`,
      buildContentTeamCopy(report),
      "",
      `#### Engineering`,
      buildEngineeringCopy(report),
      ...(gtmRiskSummary ? ["", `#### GTM Risk Summary`, gtmRiskSummary] : []),
      "",
      `### Top 5 actions`,
      ...report.fixPrioritizationArtifact.topActions.map(
        (item, index) => `- ${index + 1}. ${item.action} (${item.impact} impact, ${item.effort} effort): ${item.whyItMatters}`,
      ),
      "",
      `### AI-readable homepage summary block`,
      report.fixPack.homepageSummaryBlock,
      "",
      `### Answer-engine FAQ block`,
      ...report.fixPack.faqBlock.flatMap((item) => [`- Q: ${item.question}`, `  - A: ${item.answer}`]),
      "",
      `### Citation-ready proof block`,
      ...report.fixPack.citationReadyProofBlock.map((item) => `- ${item}`),
      "",
      `### Agent action-path copy`,
      ...report.fixPack.agentActionPathCopy.map((item) => `- ${item.label}: ${item.copy}`),
      "",
      `### Structured data / schema plan`,
      ...report.fixPack.schemaPlan.map((item) => `- ${item}`),
    ]),
    section("Before / After AI Perception Simulator", [
      `### Current likely AI / LLM summary`,
      report.beforeAfterPerception.currentLikelySummary,
      "",
      `### Improved likely AI / LLM summary`,
      report.beforeAfterPerception.improvedLikelySummary,
      "",
      `### What changed`,
      ...report.beforeAfterPerception.whatChanged.map((item) => `- ${item}`),
    ]),
    section("Visible Agent Artifacts", [
      `### Site facts captured`,
      `- Company/category summary: ${report.websiteContextArtifact.companyCategory}`,
      `- Likely audience: ${report.websiteContextArtifact.likelyAudience}`,
      `- Main offering: ${report.websiteContextArtifact.mainOffering}`,
      ...report.websiteContextArtifact.keyPagesFound.map((item) => `- Key page found: ${item}`),
      ...report.websiteContextArtifact.proofSignalsFound.map((item) => `- Proof signal found: ${item}`),
      ...report.websiteContextArtifact.missingBasics.map((item) => `- Missing basic: ${item}`),
      "",
      `### Likely machine summary`,
      report.llmPerceptionArtifact.likelySummary,
      `- Positioning interpretation: ${report.llmPerceptionArtifact.positioningInterpretation}`,
      ...report.llmPerceptionArtifact.possibleMisreadings.map((item) => `- Possible misreading: ${item}`),
      "",
      `### Agent shopper journey blockers`,
      ...report.agentVisitorArtifact.whatAgentsCanUnderstand.map((item) => `- Agents can understand: ${item}`),
      ...report.agentVisitorArtifact.journeyBlockers.map((item) => `- Journey blocker: ${item}`),
      ...report.agentVisitorArtifact.actionabilityGaps.map((item) => `- Actionability gap: ${item}`),
      "",
      `### Answer-engine readiness findings`,
      ...report.aioArtifact.strengths.map((item) => `- Strength: ${item}`),
      ...report.aioArtifact.weaknesses.map((item) => `- Weakness: ${item}`),
      ...report.aioArtifact.answerEngineObservations.map((item) => `- Observation: ${item}`),
      ...report.aioArtifact.contentStructureIssues.map((item) => `- Content structure issue: ${item}`),
      "",
      `### Evidence and proof gaps`,
      ...report.citationArtifact.strongClaims.map((item) => `- Strong claim: ${item}`),
      ...report.citationArtifact.weakClaims.map((item) => `- Weak claim: ${item}`),
      ...report.citationArtifact.proofGaps.map((item) => `- Proof gap: ${item}`),
      ...report.citationArtifact.trustGaps.map((item) => `- Trust gap: ${item}`),
      "",
      `### Fix Pack + top 5 actions`,
      ...report.fixPrioritizationArtifact.topActions.map(
        (item, index) => `- ${index + 1}. ${item.action} (${item.impact} impact, ${item.effort} effort): ${item.whyItMatters}`,
      ),
      `- First this week: ${report.fixPrioritizationArtifact.firstWeekFocus}`,
      ...report.fixPrioritizationArtifact.fixPackSummary.map((item) => `- Fix Pack component: ${item}`),
    ]),
    section(
      "Evidence Receipts",
      report.evidenceReceipts.length
        ? report.evidenceReceipts.map((item) => `- **${item.sourceName}** (${item.sourceUrl})\n  - Signal: ${item.signal}\n  - Why it matters: ${item.whyItMatters}\n  - Snippet: ${item.snippet}`)
        : ["No source receipts were available for this run because the bounded crawl could not capture enough public pages."],
    ),
  ]
    .filter(Boolean)
    .join("\n");
}
