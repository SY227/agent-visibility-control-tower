import { z } from "zod";

const priorityLevelSchema = z.enum(["High", "Medium", "Low"]);
const confidenceLevelSchema = z.enum(["High", "Medium", "Low"]);
const machineFacingGtmRiskNameSchema = z.enum([
  "Misclassification Risk",
  "Citation Weakness Risk",
  "Agent Journey Blocker",
  "Buyer Routing Risk",
  "Trust Gap",
]);
const scoreLabelSchema = z.enum(["Weak", "Emerging", "Mixed", "Strong", "Excellent"]);
const workflowStatusSchema = z.enum(["pending", "running", "completed", "blocked"]);
const workflowAgentIdSchema = z.enum([
  "website-context",
  "llm-perception",
  "agent-visitor",
  "aio-answer-engine",
  "citation-readiness",
  "fix-prioritization",
]);

const shortListItemSchema = z.string().min(8).max(260);
const mediumTextSchema = z.string().min(16).max(520);
const longTextSchema = z.string().min(24).max(1200);

function isLikelyCompanyHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === "localhost") return true;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)) return true;
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(normalized);
}

export const analyzeRequestSchema = z.object({
  url: z
    .string()
    .trim()
    .min(4)
    .max(500)
    .refine((value) => {
      try {
        const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
        const parsed = new URL(candidate);
        return ["http:", "https:"].includes(parsed.protocol) && isLikelyCompanyHostname(parsed.hostname);
      } catch {
        return false;
      }
    }, "Enter a valid company website URL."),
});

export const evidenceReceiptSchema = z.object({
  sourceName: z.string().min(2).max(180),
  sourceUrl: z.string().url().max(500),
  signal: z.string().min(6).max(220),
  whyItMatters: z.string().min(12).max(320),
  snippet: z.string().min(12).max(320),
});

export const topFixSchema = z.object({
  fix: z.string().min(8).max(220),
  whyItMatters: z.string().min(16).max(320),
  impact: priorityLevelSchema,
  effort: priorityLevelSchema,
});

export const prioritizedActionSchema = z.object({
  action: z.string().min(8).max(220),
  whyItMatters: z.string().min(16).max(320),
  impact: priorityLevelSchema,
  effort: priorityLevelSchema,
});

export const websiteContextArtifactSchema = z.object({
  companyCategory: mediumTextSchema,
  likelyAudience: mediumTextSchema,
  mainOffering: mediumTextSchema,
  keyPagesFound: z.array(shortListItemSchema).min(2).max(6),
  proofSignalsFound: z.array(shortListItemSchema).min(1).max(5),
  missingBasics: z.array(shortListItemSchema).min(1).max(5),
});

export const llmPerceptionArtifactSchema = z.object({
  likelySummary: longTextSchema,
  positioningInterpretation: mediumTextSchema,
  possibleMisreadings: z.array(shortListItemSchema).min(2).max(5),
});

export const agentVisitorArtifactSchema = z.object({
  whatAgentsCanUnderstand: z.array(shortListItemSchema).min(2).max(5),
  journeyBlockers: z.array(shortListItemSchema).min(2).max(5),
  actionabilityGaps: z.array(shortListItemSchema).min(2).max(5),
});

export const aioArtifactSchema = z.object({
  strengths: z.array(shortListItemSchema).min(1).max(5),
  weaknesses: z.array(shortListItemSchema).min(1).max(5),
  answerEngineObservations: z.array(shortListItemSchema).min(2).max(5),
  contentStructureIssues: z.array(shortListItemSchema).min(2).max(5),
});

export const citationArtifactSchema = z.object({
  strongClaims: z.array(shortListItemSchema).min(1).max(5),
  weakClaims: z.array(shortListItemSchema).min(1).max(5),
  proofGaps: z.array(shortListItemSchema).min(2).max(5),
  trustGaps: z.array(shortListItemSchema).min(1).max(5),
});

export const fixPrioritizationArtifactSchema = z.object({
  topActions: z.array(prioritizedActionSchema).min(5).max(5),
  fixPackSummary: z.array(shortListItemSchema).min(3).max(5),
  firstWeekFocus: mediumTextSchema,
});

export const fixPackFaqItemSchema = z.object({
  question: z.string().min(8).max(180),
  answer: mediumTextSchema,
});

export const fixPackActionPathItemSchema = z.object({
  label: z.string().min(4).max(80),
  copy: mediumTextSchema,
});

export const fixPackSchema = z.object({
  homepageSummaryBlock: longTextSchema,
  faqBlock: z.array(fixPackFaqItemSchema).length(5),
  citationReadyProofBlock: z.array(shortListItemSchema).min(3).max(5),
  agentActionPathCopy: z.array(fixPackActionPathItemSchema).min(3).max(4),
  schemaPlan: z.array(shortListItemSchema).min(4).max(6),
});

export const beforeAfterPerceptionSchema = z.object({
  currentLikelySummary: longTextSchema,
  improvedLikelySummary: longTextSchema,
  whatChanged: z.array(shortListItemSchema).min(4).max(6),
});

export const inferredCompetitivePeerSchema = z.object({
  name: z.string().min(2).max(120),
  confidence: confidenceLevelSchema,
  whyInferred: mediumTextSchema,
});

export const inferredCompetitiveContextSchema = z.object({
  inferredCategory: mediumTextSchema,
  categoryConfidence: confidenceLevelSchema,
  likelyPeerSet: z.array(inferredCompetitivePeerSchema).min(3).max(5),
  competitivePerceptionGap: mediumTextSchema,
  categoryVisibilityRisk: mediumTextSchema,
  differentiationNotes: z.array(shortListItemSchema).min(2).max(5),
  validationNote: mediumTextSchema,
});

export const machineFacingGtmRiskSchema = z.object({
  riskName: machineFacingGtmRiskNameSchema,
  severity: priorityLevelSchema,
  whyItMatters: mediumTextSchema,
  suggestedFix: mediumTextSchema,
});

export const geminiOrchestrationStepSchema = z.object({
  agentName: z.string().min(4).max(120),
  job: mediumTextSchema,
  outputArtifact: z.string().min(4).max(140),
});

export const geminiOrchestrationSummarySchema = z.object({
  overview: mediumTextSchema,
  steps: z.array(geminiOrchestrationStepSchema).length(6),
});

export const visibilityReportSchema = z.object({
  visibilityScore: z.number().min(0).max(100),
  scoreLabel: scoreLabelSchema,
  executiveVerdict: z.string().min(24).max(500),
  websiteContextArtifact: websiteContextArtifactSchema,
  llmPerceptionArtifact: llmPerceptionArtifactSchema,
  agentVisitorArtifact: agentVisitorArtifactSchema,
  aioArtifact: aioArtifactSchema,
  citationArtifact: citationArtifactSchema,
  fixPrioritizationArtifact: fixPrioritizationArtifactSchema,
  fixPack: fixPackSchema,
  beforeAfterPerception: beforeAfterPerceptionSchema,
  inferredCompetitiveContext: inferredCompetitiveContextSchema,
  machineFacingGtmRisks: z.array(machineFacingGtmRiskSchema).length(5),
  geminiOrchestrationSummary: geminiOrchestrationSummarySchema,
  llmPerception: z.object({
    likelySummary: z.string().min(24).max(420),
    positioningClarity: z.string().min(16).max(260),
    possibleMisreadings: z.array(z.string().min(8).max(220)).min(2).max(5),
  }),
  agentReadiness: z.object({
    whatAgentsCanUnderstand: z.array(z.string().min(8).max(220)).min(2).max(5),
    whatAgentsMaySkip: z.array(z.string().min(8).max(220)).min(2).max(5),
    actionabilityGaps: z.array(z.string().min(8).max(220)).min(2).max(5),
  }),
  aioReadiness: z.object({
    answerEngineFit: z.string().min(16).max(260),
    citationReadiness: z.string().min(16).max(260),
    structuredDataGaps: z.array(z.string().min(8).max(220)).min(2).max(5),
  }),
  humanVsAgent: z.object({
    humanPersuasionStrengths: z.array(z.string().min(8).max(220)).min(2).max(5),
    agentReadableLogicGaps: z.array(z.string().min(8).max(220)).min(2).max(5),
  }),
  journeyDiagram: z.object({
    mermaid: z.string().min(20).max(4000),
    summary: z.string().min(16).max(260),
  }),
  topFixes: z.array(topFixSchema).min(5).max(5),
  evidenceReceipts: z.array(evidenceReceiptSchema).max(8),
  limitations: z.string().min(20).max(400),
  competitorOrCategoryPositioning: z.string().min(12).max(260).optional(),
  agentShopperBlockers: z.array(z.string().min(8).max(220)).min(2).max(5),
});

export const artifactPreviewSchema = z.object({
  title: z.string().min(4).max(120),
  lead: z.string().min(8).max(260).optional(),
  bullets: z.array(z.string().min(8).max(220)).min(1).max(3),
});

export const workflowTraceItemSchema = z.object({
  id: workflowAgentIdSchema,
  label: z.string().min(2).max(120),
  status: workflowStatusSchema,
  summary: z.string().min(8).max(320),
  evidenceCount: z.number().int().min(0).max(100),
  artifactPreview: artifactPreviewSchema.optional(),
});

export const analyzeResultSchema = z.object({
  report: visibilityReportSchema,
  workflowTrace: z.array(workflowTraceItemSchema).length(6),
  scanSummary: z.object({
    normalizedUrl: z.string().url(),
    pagesAnalyzed: z.number().int().min(0).max(20),
    pagesDiscovered: z.number().int().min(0).max(500),
    pageTypes: z.array(z.string().min(2).max(80)).max(12),
    limitations: z.array(z.string().min(4).max(220)).max(6),
  }),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type VisibilityReport = z.infer<typeof visibilityReportSchema>;
export type AnalyzeResult = z.infer<typeof analyzeResultSchema>;

export const geminiResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "visibilityScore",
    "scoreLabel",
    "executiveVerdict",
    "websiteContextArtifact",
    "llmPerceptionArtifact",
    "agentVisitorArtifact",
    "aioArtifact",
    "citationArtifact",
    "fixPrioritizationArtifact",
    "fixPack",
    "beforeAfterPerception",
    "inferredCompetitiveContext",
    "machineFacingGtmRisks",
    "geminiOrchestrationSummary",
    "llmPerception",
    "agentReadiness",
    "aioReadiness",
    "humanVsAgent",
    "journeyDiagram",
    "topFixes",
    "evidenceReceipts",
    "limitations",
    "agentShopperBlockers",
  ],
  properties: {
    visibilityScore: { type: "number" },
    scoreLabel: { type: "string", enum: ["Weak", "Emerging", "Mixed", "Strong", "Excellent"] },
    executiveVerdict: { type: "string" },
    websiteContextArtifact: {
      type: "object",
      additionalProperties: false,
      required: [
        "companyCategory",
        "likelyAudience",
        "mainOffering",
        "keyPagesFound",
        "proofSignalsFound",
        "missingBasics",
      ],
      properties: {
        companyCategory: { type: "string" },
        likelyAudience: { type: "string" },
        mainOffering: { type: "string" },
        keyPagesFound: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
        proofSignalsFound: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
        missingBasics: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
      },
    },
    llmPerceptionArtifact: {
      type: "object",
      additionalProperties: false,
      required: ["likelySummary", "positioningInterpretation", "possibleMisreadings"],
      properties: {
        likelySummary: { type: "string" },
        positioningInterpretation: { type: "string" },
        possibleMisreadings: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
      },
    },
    agentVisitorArtifact: {
      type: "object",
      additionalProperties: false,
      required: ["whatAgentsCanUnderstand", "journeyBlockers", "actionabilityGaps"],
      properties: {
        whatAgentsCanUnderstand: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
        journeyBlockers: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
        actionabilityGaps: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
      },
    },
    aioArtifact: {
      type: "object",
      additionalProperties: false,
      required: ["strengths", "weaknesses", "answerEngineObservations", "contentStructureIssues"],
      properties: {
        strengths: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
        weaknesses: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
        answerEngineObservations: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
        contentStructureIssues: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
      },
    },
    citationArtifact: {
      type: "object",
      additionalProperties: false,
      required: ["strongClaims", "weakClaims", "proofGaps", "trustGaps"],
      properties: {
        strongClaims: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
        weakClaims: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
        proofGaps: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
        trustGaps: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
      },
    },
    fixPrioritizationArtifact: {
      type: "object",
      additionalProperties: false,
      required: ["topActions", "fixPackSummary", "firstWeekFocus"],
      properties: {
        topActions: {
          type: "array",
          minItems: 5,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["action", "impact", "effort", "whyItMatters"],
            properties: {
              action: { type: "string" },
              impact: { type: "string", enum: ["High", "Medium", "Low"] },
              effort: { type: "string", enum: ["High", "Medium", "Low"] },
              whyItMatters: { type: "string" },
            },
          },
        },
        fixPackSummary: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
        firstWeekFocus: { type: "string" },
      },
    },
    fixPack: {
      type: "object",
      additionalProperties: false,
      required: [
        "homepageSummaryBlock",
        "faqBlock",
        "citationReadyProofBlock",
        "agentActionPathCopy",
        "schemaPlan",
      ],
      properties: {
        homepageSummaryBlock: { type: "string" },
        faqBlock: {
          type: "array",
          minItems: 5,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["question", "answer"],
            properties: {
              question: { type: "string" },
              answer: { type: "string" },
            },
          },
        },
        citationReadyProofBlock: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
        agentActionPathCopy: {
          type: "array",
          minItems: 3,
          maxItems: 4,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "copy"],
            properties: {
              label: { type: "string" },
              copy: { type: "string" },
            },
          },
        },
        schemaPlan: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 6 },
      },
    },
    beforeAfterPerception: {
      type: "object",
      additionalProperties: false,
      required: ["currentLikelySummary", "improvedLikelySummary", "whatChanged"],
      properties: {
        currentLikelySummary: { type: "string" },
        improvedLikelySummary: { type: "string" },
        whatChanged: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 6 },
      },
    },
    inferredCompetitiveContext: {
      type: "object",
      additionalProperties: false,
      required: [
        "inferredCategory",
        "categoryConfidence",
        "likelyPeerSet",
        "competitivePerceptionGap",
        "categoryVisibilityRisk",
        "differentiationNotes",
        "validationNote",
      ],
      properties: {
        inferredCategory: { type: "string" },
        categoryConfidence: { type: "string", enum: ["High", "Medium", "Low"] },
        likelyPeerSet: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "confidence", "whyInferred"],
            properties: {
              name: { type: "string" },
              confidence: { type: "string", enum: ["High", "Medium", "Low"] },
              whyInferred: { type: "string" },
            },
          },
        },
        competitivePerceptionGap: { type: "string" },
        categoryVisibilityRisk: { type: "string" },
        differentiationNotes: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
        validationNote: { type: "string" },
      },
    },
    machineFacingGtmRisks: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["riskName", "severity", "whyItMatters", "suggestedFix"],
        properties: {
          riskName: {
            type: "string",
            enum: [
              "Misclassification Risk",
              "Citation Weakness Risk",
              "Agent Journey Blocker",
              "Buyer Routing Risk",
              "Trust Gap",
            ],
          },
          severity: { type: "string", enum: ["High", "Medium", "Low"] },
          whyItMatters: { type: "string" },
          suggestedFix: { type: "string" },
        },
      },
    },
    geminiOrchestrationSummary: {
      type: "object",
      additionalProperties: false,
      required: ["overview", "steps"],
      properties: {
        overview: { type: "string" },
        steps: {
          type: "array",
          minItems: 6,
          maxItems: 6,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["agentName", "job", "outputArtifact"],
            properties: {
              agentName: { type: "string" },
              job: { type: "string" },
              outputArtifact: { type: "string" },
            },
          },
        },
      },
    },
    llmPerception: {
      type: "object",
      additionalProperties: false,
      required: ["likelySummary", "positioningClarity", "possibleMisreadings"],
      properties: {
        likelySummary: { type: "string" },
        positioningClarity: { type: "string" },
        possibleMisreadings: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
      },
    },
    agentReadiness: {
      type: "object",
      additionalProperties: false,
      required: ["whatAgentsCanUnderstand", "whatAgentsMaySkip", "actionabilityGaps"],
      properties: {
        whatAgentsCanUnderstand: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
        whatAgentsMaySkip: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
        actionabilityGaps: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
      },
    },
    aioReadiness: {
      type: "object",
      additionalProperties: false,
      required: ["answerEngineFit", "citationReadiness", "structuredDataGaps"],
      properties: {
        answerEngineFit: { type: "string" },
        citationReadiness: { type: "string" },
        structuredDataGaps: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
      },
    },
    humanVsAgent: {
      type: "object",
      additionalProperties: false,
      required: ["humanPersuasionStrengths", "agentReadableLogicGaps"],
      properties: {
        humanPersuasionStrengths: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
        agentReadableLogicGaps: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
      },
    },
    journeyDiagram: {
      type: "object",
      additionalProperties: false,
      required: ["mermaid", "summary"],
      properties: {
        mermaid: { type: "string" },
        summary: { type: "string" },
      },
    },
    topFixes: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["fix", "whyItMatters", "impact", "effort"],
        properties: {
          fix: { type: "string" },
          whyItMatters: { type: "string" },
          impact: { type: "string", enum: ["High", "Medium", "Low"] },
          effort: { type: "string", enum: ["High", "Medium", "Low"] },
        },
      },
    },
    evidenceReceipts: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sourceName", "sourceUrl", "signal", "whyItMatters", "snippet"],
        properties: {
          sourceName: { type: "string" },
          sourceUrl: { type: "string" },
          signal: { type: "string" },
          whyItMatters: { type: "string" },
          snippet: { type: "string" },
        },
      },
    },
    limitations: { type: "string" },
    competitorOrCategoryPositioning: { type: "string" },
    agentShopperBlockers: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: { type: "string" },
    },
  },
} as const;
