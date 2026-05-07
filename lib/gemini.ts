import { GoogleGenAI } from "@google/genai";

import { buildVisibilityPrompt } from "@/lib/prompts";
import { geminiResponseJsonSchema, visibilityReportSchema } from "@/lib/schema";
import {
  buildAioArtifact,
  buildAgentVisitorArtifact,
  buildBeforeAfterPerception,
  buildCitationArtifact,
  buildFallbackMermaid,
  buildFallbackReport,
  buildFixPack,
  buildFixPrioritizationArtifact,
  buildGeminiOrchestrationSummary,
  buildInferredCompetitiveContext,
  buildLLMPerceptionArtifact,
  buildMachineFacingGtmRisks,
  buildTopFixes,
  buildWebsiteContextArtifact,
  safeCompanyName,
} from "@/lib/report-helpers";
import type { SiteScanResult, VisibilityReport } from "@/lib/types";
import { clamp, normalizeWhitespace, scoreLabel, sentence, truncate } from "@/lib/utils";

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

function toSentence(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const normalized = normalizeWhitespace(value);
  return normalized ? sentence(normalized) : fallback;
}

function stringList(value: unknown, fallback: string[], maxItems: number, maxChars = 220) {
  if (!Array.isArray(value)) {
    return fallback.map((item) => truncate(normalizeWhitespace(item), maxChars)).slice(0, maxItems);
  }

  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => truncate(normalizeWhitespace(item), maxChars))
    .filter(Boolean);

  return items.length
    ? [...new Set(items)].slice(0, maxItems)
    : fallback.map((item) => truncate(normalizeWhitespace(item), maxChars)).slice(0, maxItems);
}

function ensureMinList(items: string[], fallback: string[], minItems: number, maxItems: number, maxChars = 220) {
  const next = [...items];
  const normalizedFallback = fallback.map((item) => truncate(normalizeWhitespace(item), maxChars)).filter(Boolean);

  for (const fallbackItem of normalizedFallback) {
    if (next.length >= minItems) break;
    if (!next.includes(fallbackItem)) next.push(fallbackItem);
  }

  return next.slice(0, maxItems);
}

function levelValue(value: unknown, fallback: "High" | "Medium" | "Low") {
  return value === "High" || value === "Medium" || value === "Low" ? value : fallback;
}

function riskNameValue(
  value: unknown,
  fallback: "Misclassification Risk" | "Citation Weakness Risk" | "Agent Journey Blocker" | "Buyer Routing Risk" | "Trust Gap",
) {
  return value === "Misclassification Risk" ||
    value === "Citation Weakness Risk" ||
    value === "Agent Journey Blocker" ||
    value === "Buyer Routing Risk" ||
    value === "Trust Gap"
    ? value
    : fallback;
}

function sanitizeReport(scan: SiteScanResult, candidate: unknown): VisibilityReport {
  const fallback = buildFallbackReport(scan);
  const source = candidate && typeof candidate === "object" ? (candidate as Record<string, unknown>) : {};

  const visibilityScore = clamp(
    Math.round(typeof source.visibilityScore === "number" ? source.visibilityScore : fallback.visibilityScore),
    0,
    100,
  );

  const websiteContextArtifact = {
    ...fallback.websiteContextArtifact,
    ...(source.websiteContextArtifact && typeof source.websiteContextArtifact === "object"
      ? (source.websiteContextArtifact as Record<string, unknown>)
      : {}),
  };
  const llmPerceptionArtifact = {
    ...fallback.llmPerceptionArtifact,
    ...(source.llmPerceptionArtifact && typeof source.llmPerceptionArtifact === "object"
      ? (source.llmPerceptionArtifact as Record<string, unknown>)
      : {}),
  };
  const agentVisitorArtifact = {
    ...fallback.agentVisitorArtifact,
    ...(source.agentVisitorArtifact && typeof source.agentVisitorArtifact === "object"
      ? (source.agentVisitorArtifact as Record<string, unknown>)
      : {}),
  };
  const aioArtifact = {
    ...fallback.aioArtifact,
    ...(source.aioArtifact && typeof source.aioArtifact === "object"
      ? (source.aioArtifact as Record<string, unknown>)
      : {}),
  };
  const citationArtifact = {
    ...fallback.citationArtifact,
    ...(source.citationArtifact && typeof source.citationArtifact === "object"
      ? (source.citationArtifact as Record<string, unknown>)
      : {}),
  };
  const fixPrioritizationArtifact = {
    ...fallback.fixPrioritizationArtifact,
    ...(source.fixPrioritizationArtifact && typeof source.fixPrioritizationArtifact === "object"
      ? (source.fixPrioritizationArtifact as Record<string, unknown>)
      : {}),
  };
  const fixPack = {
    ...fallback.fixPack,
    ...(source.fixPack && typeof source.fixPack === "object" ? (source.fixPack as Record<string, unknown>) : {}),
  };
  const beforeAfterPerception = {
    ...fallback.beforeAfterPerception,
    ...(source.beforeAfterPerception && typeof source.beforeAfterPerception === "object"
      ? (source.beforeAfterPerception as Record<string, unknown>)
      : {}),
  };
  const inferredCompetitiveContext = {
    ...fallback.inferredCompetitiveContext,
    ...(source.inferredCompetitiveContext && typeof source.inferredCompetitiveContext === "object"
      ? (source.inferredCompetitiveContext as Record<string, unknown>)
      : {}),
  };
  const geminiOrchestrationSummary = {
    ...fallback.geminiOrchestrationSummary,
    ...(source.geminiOrchestrationSummary && typeof source.geminiOrchestrationSummary === "object"
      ? (source.geminiOrchestrationSummary as Record<string, unknown>)
      : {}),
  };

  const allowedUrls = new Set(scan.pages.map((page) => page.url));

  const report: VisibilityReport = {
    visibilityScore,
    scoreLabel: scoreLabel(visibilityScore),
    executiveVerdict: toSentence(source.executiveVerdict, fallback.executiveVerdict),
    websiteContextArtifact: {
      companyCategory: toSentence(websiteContextArtifact.companyCategory, fallback.websiteContextArtifact.companyCategory),
      likelyAudience: toSentence(websiteContextArtifact.likelyAudience, fallback.websiteContextArtifact.likelyAudience),
      mainOffering: toSentence(websiteContextArtifact.mainOffering, fallback.websiteContextArtifact.mainOffering),
      keyPagesFound: ensureMinList(
        stringList(websiteContextArtifact.keyPagesFound, fallback.websiteContextArtifact.keyPagesFound, 6),
        fallback.websiteContextArtifact.keyPagesFound,
        2,
        6,
      ),
      proofSignalsFound: ensureMinList(
        stringList(
          websiteContextArtifact.proofSignalsFound,
          fallback.websiteContextArtifact.proofSignalsFound,
          5,
        ),
        fallback.websiteContextArtifact.proofSignalsFound,
        1,
        5,
      ),
      missingBasics: ensureMinList(
        stringList(websiteContextArtifact.missingBasics, fallback.websiteContextArtifact.missingBasics, 5),
        fallback.websiteContextArtifact.missingBasics,
        1,
        5,
      ),
    },
    llmPerceptionArtifact: {
      likelySummary: toSentence(llmPerceptionArtifact.likelySummary, fallback.llmPerceptionArtifact.likelySummary),
      positioningInterpretation: toSentence(
        llmPerceptionArtifact.positioningInterpretation,
        fallback.llmPerceptionArtifact.positioningInterpretation,
      ),
      possibleMisreadings: stringList(
        llmPerceptionArtifact.possibleMisreadings,
        fallback.llmPerceptionArtifact.possibleMisreadings,
        5,
      ),
    },
    agentVisitorArtifact: {
      whatAgentsCanUnderstand: stringList(
        agentVisitorArtifact.whatAgentsCanUnderstand,
        fallback.agentVisitorArtifact.whatAgentsCanUnderstand,
        5,
      ),
      journeyBlockers: stringList(agentVisitorArtifact.journeyBlockers, fallback.agentVisitorArtifact.journeyBlockers, 5),
      actionabilityGaps: stringList(
        agentVisitorArtifact.actionabilityGaps,
        fallback.agentVisitorArtifact.actionabilityGaps,
        5,
      ),
    },
    aioArtifact: {
      strengths: ensureMinList(stringList(aioArtifact.strengths, fallback.aioArtifact.strengths, 5), fallback.aioArtifact.strengths, 1, 5),
      weaknesses: ensureMinList(stringList(aioArtifact.weaknesses, fallback.aioArtifact.weaknesses, 5), fallback.aioArtifact.weaknesses, 1, 5),
      answerEngineObservations: stringList(
        aioArtifact.answerEngineObservations,
        fallback.aioArtifact.answerEngineObservations,
        5,
      ),
      contentStructureIssues: ensureMinList(
        stringList(
          aioArtifact.contentStructureIssues,
          fallback.aioArtifact.contentStructureIssues,
          5,
        ),
        fallback.aioArtifact.contentStructureIssues,
        2,
        5,
      ),
    },
    citationArtifact: {
      strongClaims: ensureMinList(stringList(citationArtifact.strongClaims, fallback.citationArtifact.strongClaims, 5), fallback.citationArtifact.strongClaims, 1, 5),
      weakClaims: ensureMinList(stringList(citationArtifact.weakClaims, fallback.citationArtifact.weakClaims, 5), fallback.citationArtifact.weakClaims, 1, 5),
      proofGaps: ensureMinList(stringList(citationArtifact.proofGaps, fallback.citationArtifact.proofGaps, 5), fallback.citationArtifact.proofGaps, 2, 5),
      trustGaps: ensureMinList(stringList(citationArtifact.trustGaps, fallback.citationArtifact.trustGaps, 5), fallback.citationArtifact.trustGaps, 1, 5),
    },
    fixPrioritizationArtifact: {
      topActions: Array.isArray(fixPrioritizationArtifact.topActions)
        ? fixPrioritizationArtifact.topActions
            .filter((item) => !!item && typeof item === "object")
            .map((item, index) => {
              const record = item as unknown as Record<string, unknown>;
              return {
                action:
                  typeof record.action === "string"
                    ? sentence(normalizeWhitespace(record.action)).replace(/\.$/, "")
                    : fallback.fixPrioritizationArtifact.topActions[index]?.action || fallback.topFixes[index]?.fix,
                whyItMatters:
                  typeof record.whyItMatters === "string"
                    ? sentence(record.whyItMatters)
                    : fallback.fixPrioritizationArtifact.topActions[index]?.whyItMatters || fallback.topFixes[index]?.whyItMatters,
                impact:
                  record.impact === "High" || record.impact === "Medium" || record.impact === "Low"
                    ? record.impact
                    : fallback.fixPrioritizationArtifact.topActions[index]?.impact || fallback.topFixes[index]?.impact,
                effort:
                  record.effort === "High" || record.effort === "Medium" || record.effort === "Low"
                    ? record.effort
                    : fallback.fixPrioritizationArtifact.topActions[index]?.effort || fallback.topFixes[index]?.effort,
              };
            })
            .slice(0, 5)
        : fallback.fixPrioritizationArtifact.topActions,
      fixPackSummary: ensureMinList(
        stringList(
          fixPrioritizationArtifact.fixPackSummary,
          fallback.fixPrioritizationArtifact.fixPackSummary,
          5,
        ),
        fallback.fixPrioritizationArtifact.fixPackSummary,
        3,
        5,
      ),
      firstWeekFocus: toSentence(
        fixPrioritizationArtifact.firstWeekFocus,
        fallback.fixPrioritizationArtifact.firstWeekFocus,
      ),
    },
    fixPack: {
      homepageSummaryBlock: toSentence(fixPack.homepageSummaryBlock, fallback.fixPack.homepageSummaryBlock),
      faqBlock: Array.isArray(fixPack.faqBlock)
        ? fixPack.faqBlock
            .filter((item) => !!item && typeof item === "object")
            .map((item, index) => {
              const record = item as unknown as Record<string, unknown>;
              return {
                question:
                  typeof record.question === "string"
                    ? truncate(normalizeWhitespace(record.question), 180)
                    : fallback.fixPack.faqBlock[index]?.question,
                answer:
                  typeof record.answer === "string"
                    ? sentence(record.answer)
                    : fallback.fixPack.faqBlock[index]?.answer,
              };
            })
            .filter((item) => item.question && item.answer)
            .slice(0, 5)
        : fallback.fixPack.faqBlock,
      citationReadyProofBlock: ensureMinList(
        stringList(
          fixPack.citationReadyProofBlock,
          fallback.fixPack.citationReadyProofBlock,
          5,
          260,
        ),
        fallback.fixPack.citationReadyProofBlock,
        3,
        5,
        260,
      ),
      agentActionPathCopy: Array.isArray(fixPack.agentActionPathCopy)
        ? fixPack.agentActionPathCopy
            .filter((item) => !!item && typeof item === "object")
            .map((item, index) => {
              const record = item as unknown as Record<string, unknown>;
              return {
                label:
                  typeof record.label === "string"
                    ? truncate(normalizeWhitespace(record.label), 80)
                    : fallback.fixPack.agentActionPathCopy[index]?.label,
                copy:
                  typeof record.copy === "string"
                    ? sentence(record.copy)
                    : fallback.fixPack.agentActionPathCopy[index]?.copy,
              };
            })
            .filter((item) => item.label && item.copy)
            .slice(0, 4)
        : fallback.fixPack.agentActionPathCopy,
      schemaPlan: ensureMinList(
        stringList(fixPack.schemaPlan, fallback.fixPack.schemaPlan, 6),
        fallback.fixPack.schemaPlan,
        4,
        6,
      ),
    },
    beforeAfterPerception: {
      currentLikelySummary: toSentence(
        beforeAfterPerception.currentLikelySummary,
        fallback.beforeAfterPerception.currentLikelySummary,
      ),
      improvedLikelySummary: toSentence(
        beforeAfterPerception.improvedLikelySummary,
        fallback.beforeAfterPerception.improvedLikelySummary,
      ),
      whatChanged: ensureMinList(
        stringList(beforeAfterPerception.whatChanged, fallback.beforeAfterPerception.whatChanged, 6),
        fallback.beforeAfterPerception.whatChanged,
        4,
        6,
      ),
    },
    inferredCompetitiveContext: {
      inferredCategory: toSentence(
        inferredCompetitiveContext.inferredCategory,
        fallback.inferredCompetitiveContext.inferredCategory,
      ),
      categoryConfidence: levelValue(
        inferredCompetitiveContext.categoryConfidence,
        fallback.inferredCompetitiveContext.categoryConfidence,
      ),
      likelyPeerSet: Array.isArray(inferredCompetitiveContext.likelyPeerSet)
        ? inferredCompetitiveContext.likelyPeerSet
            .filter((item) => !!item && typeof item === "object")
            .map((item, index) => {
              const record = item as unknown as Record<string, unknown>;
              return {
                name:
                  typeof record.name === "string"
                    ? truncate(normalizeWhitespace(record.name), 120)
                    : fallback.inferredCompetitiveContext.likelyPeerSet[index]?.name,
                confidence: levelValue(
                  record.confidence,
                  fallback.inferredCompetitiveContext.likelyPeerSet[index]?.confidence || "Medium",
                ),
                whyInferred:
                  typeof record.whyInferred === "string"
                    ? sentence(record.whyInferred)
                    : fallback.inferredCompetitiveContext.likelyPeerSet[index]?.whyInferred,
              };
            })
            .filter((item) => item.name && item.whyInferred)
            .slice(0, 5)
        : fallback.inferredCompetitiveContext.likelyPeerSet,
      competitivePerceptionGap: toSentence(
        inferredCompetitiveContext.competitivePerceptionGap,
        fallback.inferredCompetitiveContext.competitivePerceptionGap,
      ),
      categoryVisibilityRisk: toSentence(
        inferredCompetitiveContext.categoryVisibilityRisk,
        fallback.inferredCompetitiveContext.categoryVisibilityRisk,
      ),
      differentiationNotes: ensureMinList(
        stringList(
          inferredCompetitiveContext.differentiationNotes,
          fallback.inferredCompetitiveContext.differentiationNotes,
          5,
        ),
        fallback.inferredCompetitiveContext.differentiationNotes,
        2,
        5,
      ),
      validationNote: toSentence(
        inferredCompetitiveContext.validationNote,
        fallback.inferredCompetitiveContext.validationNote,
      ),
    },
    machineFacingGtmRisks: Array.isArray(source.machineFacingGtmRisks)
      ? source.machineFacingGtmRisks
          .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
          .map((item, index) => ({
            riskName: riskNameValue(item.riskName, fallback.machineFacingGtmRisks[index]?.riskName || "Misclassification Risk"),
            severity: levelValue(item.severity, fallback.machineFacingGtmRisks[index]?.severity || "Medium"),
            whyItMatters:
              typeof item.whyItMatters === "string"
                ? sentence(item.whyItMatters)
                : fallback.machineFacingGtmRisks[index]?.whyItMatters,
            suggestedFix:
              typeof item.suggestedFix === "string"
                ? sentence(item.suggestedFix)
                : fallback.machineFacingGtmRisks[index]?.suggestedFix,
          }))
          .filter((item) => item.riskName && item.whyItMatters && item.suggestedFix)
          .slice(0, 5)
      : fallback.machineFacingGtmRisks,
    geminiOrchestrationSummary: {
      overview: toSentence(
        geminiOrchestrationSummary.overview,
        fallback.geminiOrchestrationSummary.overview,
      ),
      steps: Array.isArray(geminiOrchestrationSummary.steps)
        ? geminiOrchestrationSummary.steps
            .filter((item) => !!item && typeof item === "object")
            .map((item, index) => {
              const record = item as unknown as Record<string, unknown>;
              return {
                agentName:
                  typeof record.agentName === "string"
                    ? truncate(normalizeWhitespace(record.agentName), 120)
                    : fallback.geminiOrchestrationSummary.steps[index]?.agentName,
                job:
                  typeof record.job === "string"
                    ? sentence(record.job)
                    : fallback.geminiOrchestrationSummary.steps[index]?.job,
                outputArtifact:
                  typeof record.outputArtifact === "string"
                    ? truncate(normalizeWhitespace(record.outputArtifact), 140)
                    : fallback.geminiOrchestrationSummary.steps[index]?.outputArtifact,
              };
            })
            .filter((item) => item.agentName && item.job && item.outputArtifact)
            .slice(0, 6)
        : fallback.geminiOrchestrationSummary.steps,
    },
    llmPerception: {
      likelySummary: toSentence(source.llmPerception && typeof source.llmPerception === "object" ? (source.llmPerception as Record<string, unknown>).likelySummary : undefined, fallback.llmPerception.likelySummary),
      positioningClarity: toSentence(
        source.llmPerception && typeof source.llmPerception === "object"
          ? (source.llmPerception as Record<string, unknown>).positioningClarity
          : undefined,
        fallback.llmPerception.positioningClarity,
      ),
      possibleMisreadings: stringList(
        source.llmPerception && typeof source.llmPerception === "object"
          ? (source.llmPerception as Record<string, unknown>).possibleMisreadings
          : undefined,
        fallback.llmPerception.possibleMisreadings,
        5,
      ),
    },
    agentReadiness: {
      whatAgentsCanUnderstand: stringList(
        source.agentReadiness && typeof source.agentReadiness === "object"
          ? (source.agentReadiness as Record<string, unknown>).whatAgentsCanUnderstand
          : undefined,
        fallback.agentReadiness.whatAgentsCanUnderstand,
        5,
      ),
      whatAgentsMaySkip: stringList(
        source.agentReadiness && typeof source.agentReadiness === "object"
          ? (source.agentReadiness as Record<string, unknown>).whatAgentsMaySkip
          : undefined,
        fallback.agentReadiness.whatAgentsMaySkip,
        5,
      ),
      actionabilityGaps: stringList(
        source.agentReadiness && typeof source.agentReadiness === "object"
          ? (source.agentReadiness as Record<string, unknown>).actionabilityGaps
          : undefined,
        fallback.agentReadiness.actionabilityGaps,
        5,
      ),
    },
    aioReadiness: {
      answerEngineFit: toSentence(
        source.aioReadiness && typeof source.aioReadiness === "object"
          ? (source.aioReadiness as Record<string, unknown>).answerEngineFit
          : undefined,
        fallback.aioReadiness.answerEngineFit,
      ),
      citationReadiness: toSentence(
        source.aioReadiness && typeof source.aioReadiness === "object"
          ? (source.aioReadiness as Record<string, unknown>).citationReadiness
          : undefined,
        fallback.aioReadiness.citationReadiness,
      ),
      structuredDataGaps: ensureMinList(
        stringList(
          source.aioReadiness && typeof source.aioReadiness === "object"
            ? (source.aioReadiness as Record<string, unknown>).structuredDataGaps
            : undefined,
          fallback.aioReadiness.structuredDataGaps,
          5,
        ),
        fallback.aioReadiness.structuredDataGaps,
        2,
        5,
      ),
    },
    humanVsAgent: {
      humanPersuasionStrengths: stringList(
        source.humanVsAgent && typeof source.humanVsAgent === "object"
          ? (source.humanVsAgent as Record<string, unknown>).humanPersuasionStrengths
          : undefined,
        fallback.humanVsAgent.humanPersuasionStrengths,
        5,
      ),
      agentReadableLogicGaps: stringList(
        source.humanVsAgent && typeof source.humanVsAgent === "object"
          ? (source.humanVsAgent as Record<string, unknown>).agentReadableLogicGaps
          : undefined,
        fallback.humanVsAgent.agentReadableLogicGaps,
        5,
      ),
    },
    journeyDiagram: {
      mermaid:
        source.journeyDiagram &&
        typeof source.journeyDiagram === "object" &&
        typeof (source.journeyDiagram as Record<string, unknown>).mermaid === "string" &&
        normalizeWhitespace(String((source.journeyDiagram as Record<string, unknown>).mermaid)).includes("flowchart")
          ? String((source.journeyDiagram as Record<string, unknown>).mermaid)
          : fallback.journeyDiagram.mermaid || buildFallbackMermaid(scan),
      summary: toSentence(
        source.journeyDiagram && typeof source.journeyDiagram === "object"
          ? (source.journeyDiagram as Record<string, unknown>).summary
          : undefined,
        fallback.journeyDiagram.summary,
      ),
    },
    topFixes: Array.isArray(source.topFixes)
      ? source.topFixes
          .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
          .map((item, index) => ({
            fix:
              typeof item.fix === "string"
                ? sentence(normalizeWhitespace(item.fix)).replace(/\.$/, "")
                : fallback.topFixes[index]?.fix,
            whyItMatters:
              typeof item.whyItMatters === "string"
                ? sentence(item.whyItMatters)
                : fallback.topFixes[index]?.whyItMatters,
            impact:
              item.impact === "High" || item.impact === "Medium" || item.impact === "Low"
                ? item.impact
                : fallback.topFixes[index]?.impact,
            effort:
              item.effort === "High" || item.effort === "Medium" || item.effort === "Low"
                ? item.effort
                : fallback.topFixes[index]?.effort,
          }))
          .filter((item) => item.fix && item.whyItMatters)
          .slice(0, 5)
      : fallback.topFixes,
    evidenceReceipts: Array.isArray(source.evidenceReceipts)
      ? source.evidenceReceipts
          .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
          .map((item, index) => ({
            sourceName:
              typeof item.sourceName === "string"
                ? truncate(normalizeWhitespace(item.sourceName), 180)
                : fallback.evidenceReceipts[index]?.sourceName,
            sourceUrl:
              typeof item.sourceUrl === "string"
                ? item.sourceUrl
                : fallback.evidenceReceipts[index]?.sourceUrl,
            signal:
              typeof item.signal === "string"
                ? sentence(item.signal)
                : fallback.evidenceReceipts[index]?.signal,
            whyItMatters:
              typeof item.whyItMatters === "string"
                ? sentence(item.whyItMatters)
                : fallback.evidenceReceipts[index]?.whyItMatters,
            snippet:
              typeof item.snippet === "string"
                ? truncate(normalizeWhitespace(item.snippet), 320)
                : fallback.evidenceReceipts[index]?.snippet,
          }))
          .filter((item) => item.sourceName && item.sourceUrl && item.signal && item.whyItMatters && item.snippet)
          .slice(0, 8)
      : fallback.evidenceReceipts,
    limitations: toSentence(source.limitations, fallback.limitations),
    competitorOrCategoryPositioning:
      typeof source.competitorOrCategoryPositioning === "string"
        ? sentence(source.competitorOrCategoryPositioning)
        : fallback.competitorOrCategoryPositioning,
    agentShopperBlockers: stringList(source.agentShopperBlockers, fallback.agentShopperBlockers, 5),
  };

  while (report.fixPrioritizationArtifact.topActions.length < 5) {
    const nextIndex = report.fixPrioritizationArtifact.topActions.length;
    const fallbackAction = fallback.fixPrioritizationArtifact.topActions[nextIndex] || {
      action: fallback.topFixes[nextIndex].fix,
      whyItMatters: fallback.topFixes[nextIndex].whyItMatters,
      impact: fallback.topFixes[nextIndex].impact,
      effort: fallback.topFixes[nextIndex].effort,
    };
    report.fixPrioritizationArtifact.topActions.push(fallbackAction);
  }

  while (report.topFixes.length < 5) {
    report.topFixes.push(fallback.topFixes[report.topFixes.length]);
  }

  while (report.fixPack.faqBlock.length < 5) {
    report.fixPack.faqBlock.push(fallback.fixPack.faqBlock[report.fixPack.faqBlock.length]);
  }

  while (report.fixPack.agentActionPathCopy.length < 3) {
    report.fixPack.agentActionPathCopy.push(
      fallback.fixPack.agentActionPathCopy[report.fixPack.agentActionPathCopy.length],
    );
  }

  while (report.inferredCompetitiveContext.likelyPeerSet.length < 3) {
    report.inferredCompetitiveContext.likelyPeerSet.push(
      fallback.inferredCompetitiveContext.likelyPeerSet[report.inferredCompetitiveContext.likelyPeerSet.length],
    );
  }

  while (report.machineFacingGtmRisks.length < 5) {
    report.machineFacingGtmRisks.push(fallback.machineFacingGtmRisks[report.machineFacingGtmRisks.length]);
  }

  while (report.geminiOrchestrationSummary.steps.length < 6) {
    report.geminiOrchestrationSummary.steps.push(
      fallback.geminiOrchestrationSummary.steps[report.geminiOrchestrationSummary.steps.length],
    );
  }

  report.evidenceReceipts = report.evidenceReceipts.filter((receipt) => allowedUrls.has(receipt.sourceUrl));

  while (report.evidenceReceipts.length < 4) {
    report.evidenceReceipts.push(fallback.evidenceReceipts[report.evidenceReceipts.length]);
  }

  if (!report.websiteContextArtifact.missingBasics.length) {
    report.websiteContextArtifact.missingBasics = fallback.websiteContextArtifact.missingBasics;
  }

  if (!report.aioArtifact.weaknesses.length) {
    report.aioArtifact.weaknesses = fallback.aioArtifact.weaknesses;
  }

  if (!report.beforeAfterPerception.whatChanged.length) {
    report.beforeAfterPerception.whatChanged = fallback.beforeAfterPerception.whatChanged;
  }

  return visibilityReportSchema.parse(report);
}

export async function generateVisibilityReport(scan: SiteScanResult) {
  const fallback = buildFallbackReport(scan);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || scan.pages.length === 0) {
    return fallback;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: buildVisibilityPrompt(scan),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: geminiResponseJsonSchema,
        temperature: 0.35,
        topP: 0.9,
      },
    });

    const text = response.text;
    if (!text) return fallback;
    const parsed = JSON.parse(text) as unknown;
    return sanitizeReport(scan, parsed);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Gemini synthesis failed";
    const artifactFallback = buildFallbackReport(scan);
    artifactFallback.executiveVerdict = sentence(
      `${artifactFallback.executiveVerdict} Public signals for ${safeCompanyName(scan)} were still usable, but this run fell back to local synthesis`,
    );
    artifactFallback.limitations = truncate(
      sentence(`${artifactFallback.limitations} Gemini fallback note: ${truncate(reason, 160)}`),
      400,
    );

    artifactFallback.websiteContextArtifact = buildWebsiteContextArtifact(scan);
    artifactFallback.llmPerceptionArtifact = buildLLMPerceptionArtifact(scan, artifactFallback.websiteContextArtifact);
    artifactFallback.agentVisitorArtifact = buildAgentVisitorArtifact(scan);
    artifactFallback.aioArtifact = buildAioArtifact(scan);
    artifactFallback.citationArtifact = buildCitationArtifact(scan);
    artifactFallback.topFixes = buildTopFixes(scan);
    artifactFallback.fixPrioritizationArtifact = buildFixPrioritizationArtifact(scan, artifactFallback.topFixes);
    artifactFallback.fixPack = buildFixPack(scan, artifactFallback.websiteContextArtifact, artifactFallback.citationArtifact);
    artifactFallback.beforeAfterPerception = buildBeforeAfterPerception(
      scan,
      artifactFallback.llmPerceptionArtifact,
      artifactFallback.websiteContextArtifact,
      artifactFallback.fixPack,
    );
    artifactFallback.inferredCompetitiveContext = buildInferredCompetitiveContext(
      scan,
      artifactFallback.websiteContextArtifact,
    );
    artifactFallback.machineFacingGtmRisks = buildMachineFacingGtmRisks(
      scan,
      artifactFallback.websiteContextArtifact,
    );
    artifactFallback.geminiOrchestrationSummary = buildGeminiOrchestrationSummary();

    return visibilityReportSchema.parse(artifactFallback);
  }
}
