import { Copy, Printer } from "lucide-react";

import { AgentArtifactCards } from "@/components/agent-artifact-cards";
import { BeforeAfterPerceptionSimulator } from "@/components/before-after-perception";
import { BoardroomSnapshot } from "@/components/boardroom-snapshot";
import { DecisionMemo } from "@/components/decision-memo";
import { EvidenceReceipts } from "@/components/evidence-receipts";
import { FixPackSection } from "@/components/fix-pack-section";
import { GeminiOrchestrationSummary } from "@/components/gemini-orchestration-summary";
import { InferredCompetitiveContext } from "@/components/inferred-competitive-context";
import { JudgeRubricSnapshot } from "@/components/judge-rubric-snapshot";
import { JourneyDiagram } from "@/components/journey-diagram";
import { MachineFacingGtmRisks } from "@/components/machine-facing-gtm-risks";
import { VisibilityScoreCard } from "@/components/visibility-score-card";
import { WhyGeminiStrip } from "@/components/why-gemini-strip";
import { Badge, Button, Card, SectionHeading } from "@/components/ui";
import type { VisibilityReport } from "@/lib/types";
import { scoreTone } from "@/lib/utils";

export function ReadinessBrief({
  report,
  onCopyMarkdown,
}: {
  report: VisibilityReport;
  onCopyMarkdown: () => void;
}) {
  const topGap =
    report.agentVisitorArtifact.journeyBlockers[0] ||
    report.agentShopperBlockers[0] ||
    report.topFixes[0]?.fix ||
    "Machines may still struggle to determine the next buyer action from the public site.";

  return (
    <section className="space-y-8">
      <SectionHeading
        eyebrow="AI Visibility Readiness Brief"
        title="Executive artifact"
        description="A directional public-page read of how machines understand, cite, route, or skip the company today, plus the repair outputs that strengthen it next."
      />

      <Card className="p-6 sm:p-7 print-break-inside-avoid">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge tone={scoreTone(report.visibilityScore)}>{report.scoreLabel}</Badge>
            <div>
              <div className="text-sm font-medium text-[var(--muted)]">Executive Verdict</div>
              <p className="mt-2 max-w-4xl text-[16px] leading-8 text-[var(--ink)]">{report.executiveVerdict}</p>
            </div>
          </div>

          <div className="flex gap-2 no-print">
            <Button variant="secondary" onClick={onCopyMarkdown}>
              <Copy className="h-4 w-4" />
              Copy Brief
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </Button>
          </div>
        </div>
      </Card>

      <BoardroomSnapshot report={report} />

      <div className="grid gap-4 md:grid-cols-3">
        <VisibilityScoreCard
          label="AI Visibility Score"
          score={report.visibilityScore}
          detail="A directional composite of clarity, crawlability, citation support, and agent actionability."
        />
        <VisibilityScoreCard
          label="Citation Readiness"
          score={Math.max(
            0,
            Math.min(100, report.visibilityScore - (report.aioReadiness.structuredDataGaps.length > 2 ? 12 : 4)),
          )}
          detail={report.aioReadiness.citationReadiness}
        />
        <VisibilityScoreCard
          label="Agent Actionability"
          score={Math.max(0, Math.min(100, report.visibilityScore - report.agentReadiness.actionabilityGaps.length * 6))}
          detail={report.agentReadiness.actionabilityGaps[0] || "Action paths look relatively clear in the bounded crawl."}
        />
      </div>

      <DecisionMemo report={report} />

      <Card className="border-[rgba(209,165,66,0.22)] bg-[var(--amber-soft)] p-5 sm:p-6">
        <div className="space-y-3">
          <Badge tone="amber">Top machine-facing gap</Badge>
          <div className="text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)]">{topGap}</div>
          <p className="max-w-4xl text-sm leading-7 text-[var(--slate)]">
            {report.topFixes[0]?.whyItMatters ||
              "This is the clearest blocker currently standing between public understanding and machine-mediated action."}
          </p>
        </div>
      </Card>

      <MachineFacingGtmRisks report={report} />
      <InferredCompetitiveContext report={report} />
      <FixPackSection report={report} />
      <BeforeAfterPerceptionSimulator perception={report.beforeAfterPerception} />
      <AgentArtifactCards report={report} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ListCard
          title="What LLMs may say about this company"
          lead={report.llmPerception.likelySummary}
          items={[
            `Positioning clarity: ${report.llmPerception.positioningClarity}`,
            ...report.llmPerception.possibleMisreadings.map((item) => `Possible misreading: ${item}`),
          ]}
        />
        <ListCard
          title="Human persuasion vs agent-readable logic"
          items={[
            ...report.humanVsAgent.humanPersuasionStrengths.map((item) => `Human strength: ${item}`),
            ...report.humanVsAgent.agentReadableLogicGaps.map((item) => `Agent gap: ${item}`),
          ]}
          tone="sage"
        />
        <ListCard title="Structured data / schema gaps" items={report.aioReadiness.structuredDataGaps} tone="amber" />
        <ListCard title="Agent shopper / buyer journey blockers" items={report.agentShopperBlockers} tone="critical" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="space-y-4">
            <div>
              <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">Citation readiness</div>
              <p className="mt-2 text-sm leading-7 text-[var(--slate)]">{report.aioReadiness.citationReadiness}</p>
            </div>
            <div>
              <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">AIO / answer-engine fit</div>
              <p className="mt-2 text-sm leading-7 text-[var(--slate)]">{report.aioReadiness.answerEngineFit}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">
              Directional category visibility note
            </div>
            <p className="text-sm leading-7 text-[var(--slate)]">{report.inferredCompetitiveContext.validationNote}</p>
          </div>
        </Card>
      </div>

      <JourneyDiagram mermaid={report.journeyDiagram.mermaid} summary={report.journeyDiagram.summary} />
      <EvidenceReceipts receipts={report.evidenceReceipts} />
      <GeminiOrchestrationSummary report={report} />
      <WhyGeminiStrip />
      <JudgeRubricSnapshot />

      <Card className="p-5 sm:p-6">
        <div className="space-y-3">
          <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">Limitations / confidence note</div>
          <p className="text-sm leading-7 text-[var(--slate)]">{report.limitations}</p>
        </div>
      </Card>
    </section>
  );
}

function ListCard({
  title,
  items,
  lead,
  tone = "default",
}: {
  title: string;
  items: string[];
  lead?: string;
  tone?: "default" | "sage" | "amber" | "critical";
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="space-y-4">
        <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">{title}</div>
        {lead ? <p className="text-sm leading-7 text-[var(--slate)]">{lead}</p> : null}
        <div className="space-y-3">
          {items.map((item, itemIndex) => (
            <div
              key={`${title}-${tone}-${itemIndex}`}
              className={
                tone === "sage"
                  ? "rounded-[20px] bg-[var(--sage-soft)] px-4 py-3 text-sm leading-6 text-[var(--slate)]"
                  : tone === "amber"
                    ? "rounded-[20px] bg-[var(--amber-soft)] px-4 py-3 text-sm leading-6 text-[var(--slate)]"
                    : tone === "critical"
                      ? "rounded-[20px] bg-[var(--red-soft)] px-4 py-3 text-sm leading-6 text-[var(--slate)]"
                      : "rounded-[20px] bg-white/88 px-4 py-3 text-sm leading-6 text-[var(--slate)]"
              }
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
