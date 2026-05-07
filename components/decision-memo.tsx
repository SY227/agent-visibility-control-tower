import { Badge, Card } from "@/components/ui";
import type { MachineFacingGtmRisk, VisibilityReport } from "@/lib/types";

const severityOrder: Record<MachineFacingGtmRisk["severity"], number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

function pickPrimaryRisk(report: VisibilityReport) {
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

export function DecisionMemo({ report }: { report: VisibilityReport }) {
  const primaryRisk = pickPrimaryRisk(report);
  const recommendedAction = report.fixPrioritizationArtifact.firstWeekFocus || report.topFixes[0]?.fix;
  const posture = report.scoreLabel;
  const owner = pickOwner(report);

  return (
    <Card className="p-5 sm:p-6">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--green-deep)]">
              Decision Memo
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--slate)]">
              Compact investment-committee style summary for immediate forwarding.
            </p>
          </div>
          <Badge tone="success">This week</Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MemoField label="Current posture" value={posture} />
          <MemoField
            label="Primary risk"
            value={primaryRisk ? `${primaryRisk.riskName} (${primaryRisk.severity})` : report.agentVisitorArtifact.journeyBlockers[0]}
          />
          <MemoField label="Recommended action" value={recommendedAction || "Prioritize the top Fix Pack action."} />
          <MemoField label="Suggested owner" value={owner} />
          <MemoField label="Time horizon" value="This week" />
        </div>
      </div>
    </Card>
  );
}

function MemoField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-white/88 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
      <div className="mt-3 text-sm font-semibold leading-6 text-[var(--ink)]">{value || "Directional review required."}</div>
    </div>
  );
}
