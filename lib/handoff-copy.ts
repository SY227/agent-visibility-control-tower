import type { VisibilityReport } from "@/lib/types";

function joinList(items: string[], prefix = "- ") {
  return items.map((item) => `${prefix}${item}`).join("\n");
}

export function buildExecutiveSummaryCopy(report: VisibilityReport) {
  return [
    `Executive verdict: ${report.executiveVerdict}`,
    `AI Visibility Score: ${report.visibilityScore}/100 (${report.scoreLabel})`,
    `Top machine-facing gap: ${report.agentVisitorArtifact.journeyBlockers[0] || report.topFixes[0]?.fix}`,
    "Machine-Facing GTM Risks:",
    ...report.machineFacingGtmRisks.map(
      (risk) => `- ${risk.riskName} (${risk.severity}): ${risk.whyItMatters} Suggested fix: ${risk.suggestedFix}`,
    ),
    `First-week priority: ${report.fixPrioritizationArtifact.firstWeekFocus}`,
  ].join("\n\n");
}

export function buildContentTeamCopy(report: VisibilityReport) {
  const contentFixes = report.topFixes
    .filter((item) => /homepage|copy|proof|faq|content|category|audience/i.test(`${item.fix} ${item.whyItMatters}`))
    .slice(0, 4)
    .map((item) => `- ${item.fix}: ${item.whyItMatters}`);

  return [
    "Homepage summary block:",
    report.fixPack.homepageSummaryBlock,
    "",
    "FAQ block:",
    ...report.fixPack.faqBlock.flatMap((item) => [`- ${item.question}`, `  ${item.answer}`]),
    "",
    "Citation-ready proof block:",
    ...report.fixPack.citationReadyProofBlock.map((item) => `- ${item}`),
    "",
    "Content-facing fixes:",
    ...(contentFixes.length ? contentFixes : ["- Use the homepage summary, FAQ block, and proof block as the first content repair pass."]),
  ].join("\n");
}

export function buildEngineeringCopy(report: VisibilityReport) {
  return [
    "Schema plan:",
    joinList(report.fixPack.schemaPlan),
    "",
    "Agent action-path copy:",
    ...report.fixPack.agentActionPathCopy.map((item) => `- ${item.label}: ${item.copy}`),
    "",
    "Structured data recommendations:",
    ...report.aioReadiness.structuredDataGaps.map((item) => `- ${item}`),
  ].join("\n");
}

export function buildGtmRiskSummaryCopy(report: VisibilityReport) {
  if (!report.machineFacingGtmRisks.length) return "";

  return [
    "Machine-Facing GTM Risk Summary",
    ...report.machineFacingGtmRisks.map(
      (risk) => `- ${risk.riskName} | ${risk.severity} | ${risk.whyItMatters} | Suggested fix: ${risk.suggestedFix}`,
    ),
  ].join("\n");
}
