export type WorkflowAgentId =
  | "website-context"
  | "llm-perception"
  | "agent-visitor"
  | "aio-answer-engine"
  | "citation-readiness"
  | "fix-prioritization";

export type WorkflowStatus = "pending" | "running" | "completed" | "blocked";
export type PriorityLevel = "High" | "Medium" | "Low";
export type ConfidenceLevel = "High" | "Medium" | "Low";
export type ScoreLabel = "Weak" | "Emerging" | "Mixed" | "Strong" | "Excellent";
export type MachineFacingGtmRiskName =
  | "Misclassification Risk"
  | "Citation Weakness Risk"
  | "Agent Journey Blocker"
  | "Buyer Routing Risk"
  | "Trust Gap";

export interface SampleCase {
  name: string;
  url: string;
  note: string;
}

export interface InternalLinkReference {
  label: string;
  url: string;
}

export interface SitePage {
  url: string;
  normalizedUrl: string;
  pageType: string;
  title: string;
  metaDescription: string;
  h1: string;
  headings: string[];
  bodyText: string;
  snippet: string;
  schemaTypes: string[];
  internalLinks: InternalLinkReference[];
  pricingSignals: string[];
  proofSignals: string[];
  trustSignals: string[];
  useCaseSignals: string[];
  actionSignals: string[];
  citationSignals: string[];
}

export interface SiteFacts {
  pagesAnalyzed: number;
  pagesDiscovered: number;
  pageTypes: string[];
  pagesWithSchema: number;
  pagesWithPricing: number;
  pagesWithProof: number;
  pagesWithUseCases: number;
  pagesWithActions: number;
  pagesWithThinContent: number;
  robotsStatus: "found" | "not_found" | "blocked" | "unknown";
  sitemapStatus: "found" | "not_found" | "blocked" | "unknown";
}

export interface EvidenceReceipt {
  sourceName: string;
  sourceUrl: string;
  signal: string;
  whyItMatters: string;
  snippet: string;
}

export interface SiteScanResult {
  inputUrl: string;
  normalizedUrl: string;
  pages: SitePage[];
  facts: SiteFacts;
  evidenceReceipts: EvidenceReceipt[];
  crawlNotes: string[];
  limitations: string[];
}

export interface AgentArtifactPreview {
  title: string;
  lead?: string;
  bullets: string[];
}

export interface WorkflowTraceItem {
  id: WorkflowAgentId;
  label: string;
  status: WorkflowStatus;
  summary: string;
  evidenceCount: number;
  artifactPreview?: AgentArtifactPreview;
}

export interface TopFix {
  fix: string;
  whyItMatters: string;
  impact: PriorityLevel;
  effort: PriorityLevel;
}

export interface PrioritizedAction {
  action: string;
  impact: PriorityLevel;
  effort: PriorityLevel;
  whyItMatters: string;
}

export interface WebsiteContextArtifact {
  companyCategory: string;
  likelyAudience: string;
  mainOffering: string;
  keyPagesFound: string[];
  proofSignalsFound: string[];
  missingBasics: string[];
}

export interface LLMPerceptionArtifact {
  likelySummary: string;
  positioningInterpretation: string;
  possibleMisreadings: string[];
}

export interface AgentVisitorArtifact {
  whatAgentsCanUnderstand: string[];
  journeyBlockers: string[];
  actionabilityGaps: string[];
}

export interface AioArtifact {
  strengths: string[];
  weaknesses: string[];
  answerEngineObservations: string[];
  contentStructureIssues: string[];
}

export interface CitationArtifact {
  strongClaims: string[];
  weakClaims: string[];
  proofGaps: string[];
  trustGaps: string[];
}

export interface FixPrioritizationArtifact {
  topActions: PrioritizedAction[];
  fixPackSummary: string[];
  firstWeekFocus: string;
}

export interface FixPackFaqItem {
  question: string;
  answer: string;
}

export interface FixPackActionPathItem {
  label: string;
  copy: string;
}

export interface FixPack {
  homepageSummaryBlock: string;
  faqBlock: FixPackFaqItem[];
  citationReadyProofBlock: string[];
  agentActionPathCopy: FixPackActionPathItem[];
  schemaPlan: string[];
}

export interface BeforeAfterPerception {
  currentLikelySummary: string;
  improvedLikelySummary: string;
  whatChanged: string[];
}

export interface InferredCompetitivePeer {
  name: string;
  confidence: ConfidenceLevel;
  whyInferred: string;
}

export interface InferredCompetitiveContext {
  inferredCategory: string;
  categoryConfidence: ConfidenceLevel;
  likelyPeerSet: InferredCompetitivePeer[];
  competitivePerceptionGap: string;
  categoryVisibilityRisk: string;
  differentiationNotes: string[];
  validationNote: string;
}

export interface MachineFacingGtmRisk {
  riskName: MachineFacingGtmRiskName;
  severity: PriorityLevel;
  whyItMatters: string;
  suggestedFix: string;
}

export interface GeminiOrchestrationStep {
  agentName: string;
  job: string;
  outputArtifact: string;
}

export interface GeminiOrchestrationSummary {
  overview: string;
  steps: GeminiOrchestrationStep[];
}

export interface VisibilityReport {
  visibilityScore: number;
  scoreLabel: ScoreLabel;
  executiveVerdict: string;
  websiteContextArtifact: WebsiteContextArtifact;
  llmPerceptionArtifact: LLMPerceptionArtifact;
  agentVisitorArtifact: AgentVisitorArtifact;
  aioArtifact: AioArtifact;
  citationArtifact: CitationArtifact;
  fixPrioritizationArtifact: FixPrioritizationArtifact;
  fixPack: FixPack;
  beforeAfterPerception: BeforeAfterPerception;
  inferredCompetitiveContext: InferredCompetitiveContext;
  machineFacingGtmRisks: MachineFacingGtmRisk[];
  geminiOrchestrationSummary: GeminiOrchestrationSummary;
  llmPerception: {
    likelySummary: string;
    positioningClarity: string;
    possibleMisreadings: string[];
  };
  agentReadiness: {
    whatAgentsCanUnderstand: string[];
    whatAgentsMaySkip: string[];
    actionabilityGaps: string[];
  };
  aioReadiness: {
    answerEngineFit: string;
    citationReadiness: string;
    structuredDataGaps: string[];
  };
  humanVsAgent: {
    humanPersuasionStrengths: string[];
    agentReadableLogicGaps: string[];
  };
  journeyDiagram: {
    mermaid: string;
    summary: string;
  };
  topFixes: TopFix[];
  evidenceReceipts: EvidenceReceipt[];
  limitations: string;
  competitorOrCategoryPositioning?: string;
  agentShopperBlockers: string[];
}

export interface AnalyzeResultPayload {
  report: VisibilityReport;
  workflowTrace: WorkflowTraceItem[];
  scanSummary: {
    normalizedUrl: string;
    pagesAnalyzed: number;
    pagesDiscovered: number;
    pageTypes: string[];
    limitations: string[];
  };
}

export interface ProgressEvent {
  agentId: WorkflowAgentId;
  status: WorkflowStatus;
  message: string;
  evidenceCount?: number;
  artifactPreview?: AgentArtifactPreview;
}
