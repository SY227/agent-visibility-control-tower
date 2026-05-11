import { Copy, Printer } from "lucide-react";

import { AgentArtifactCards } from "@/components/agent-artifact-cards";
import { BeforeAfterPerceptionSimulator } from "@/components/before-after-perception";
import { BoardroomSnapshot } from "@/components/boardroom-snapshot";
import { DecisionMemo } from "@/components/decision-memo";
import { EvidenceReceipts } from "@/components/evidence-receipts";
import { FixPackSection } from "@/components/fix-pack-section";
import { InferredCompetitiveContext } from "@/components/inferred-competitive-context";
import { MachineFacingGtmRisks } from "@/components/machine-facing-gtm-risks";
import { VisibilityScoreCard } from "@/components/visibility-score-card";
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
      <DecisionMemo report={report} />

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

      <FixPackSection report={report} />
      <MachineFacingGtmRisks report={report} />
      <InferredCompetitiveContext report={report} />
      <BeforeAfterPerceptionSimulator perception={report.beforeAfterPerception} />
      <EvidenceReceipts receipts={report.evidenceReceipts} />
      <AgentArtifactCards report={report} />
    </section>
  );
}

