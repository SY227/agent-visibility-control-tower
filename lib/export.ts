import {
  buildContentTeamCopy,
  buildEngineeringCopy,
  buildExecutiveSummaryCopy,
  buildGtmRiskSummaryCopy,
} from "@/lib/handoff-copy";
import type { VisibilityReport } from "@/lib/types";

function section(title: string, lines: string[]) {
  return [`## ${title}`, ...lines, ""].join("\n");
}

export function buildMarkdownBrief(report: VisibilityReport) {
  const gtmRiskSummary = buildGtmRiskSummaryCopy(report);

  return [
    `# AI Visibility Readiness Brief`,
    "",
    `**AI Visibility Score:** ${report.visibilityScore} / 100 (${report.scoreLabel})`,
    "",
    section("Executive Verdict", [report.executiveVerdict]),
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
    section("AIO / answer engine readiness", [
      `- Answer-engine fit: ${report.aioReadiness.answerEngineFit}`,
      `- Citation readiness: ${report.aioReadiness.citationReadiness}`,
      ...report.aioReadiness.structuredDataGaps.map((item) => `- Structured data gap: ${item}`),
    ]),
    section("Human persuasion vs agent-readable logic", [
      ...report.humanVsAgent.humanPersuasionStrengths.map((item) => `- Human persuasion strength: ${item}`),
      ...report.humanVsAgent.agentReadableLogicGaps.map((item) => `- Agent-readable logic gap: ${item}`),
    ]),
    section("Journey diagram", ["```mermaid", report.journeyDiagram.mermaid, "```", report.journeyDiagram.summary]),
    section("Fix Pack", [
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
    section("Workflow handoff copy", [
      `### Executive summary`,
      buildExecutiveSummaryCopy(report),
      "",
      `### Content team`,
      buildContentTeamCopy(report),
      "",
      `### Engineering`,
      buildEngineeringCopy(report),
      ...(gtmRiskSummary ? ["", `### GTM risk summary`, gtmRiskSummary] : []),
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
    section(
      "Evidence receipts",
      report.evidenceReceipts.length
        ? report.evidenceReceipts.map((item) => `- **${item.sourceName}** (${item.sourceUrl})\n  - Signal: ${item.signal}\n  - Why it matters: ${item.whyItMatters}\n  - Snippet: ${item.snippet}`)
        : ["No source receipts were available for this run because the bounded crawl could not capture enough public pages."],
    ),
    section("Gemini Orchestration Summary", [
      report.geminiOrchestrationSummary.overview,
      ...report.geminiOrchestrationSummary.steps.map(
        (step) => `- **${step.agentName}** -> ${step.job} Output artifact: ${step.outputArtifact}`,
      ),
    ]),
    section("Limitations / confidence note", [report.limitations]),
  ]
    .filter(Boolean)
    .join("\n");
}
