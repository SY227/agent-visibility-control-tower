import { Badge, Card, SectionHeading } from "@/components/ui";
import type { MachineFacingGtmRisk, VisibilityReport } from "@/lib/types";

const severityOrder: Record<MachineFacingGtmRisk["severity"], number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

function topRisk(report: VisibilityReport) {
  return [...report.machineFacingGtmRisks].sort(
    (left, right) => severityOrder[right.severity] - severityOrder[left.severity],
  )[0];
}

export function BoardroomSnapshot({ report }: { report: VisibilityReport }) {
  const risk = topRisk(report);
  const firstMove = report.fixPrioritizationArtifact.firstWeekFocus || report.topFixes[0]?.fix;
  const businessConsequence =
    report.topFixes[0]?.whyItMatters ||
    report.inferredCompetitiveContext.categoryVisibilityRisk ||
    report.executiveVerdict;
  const journeyBlocker = report.agentVisitorArtifact.journeyBlockers[0];

  return (
    <section className="space-y-5">
      <SectionHeading
        eyebrow="Boardroom Snapshot"
        title="Boardroom view of the machine-facing GTM layer"
        description="Compress the result into the decision page: what machines may get wrong, why that matters commercially, and what should happen this week."
      />

      <Card className="p-5 sm:p-6">
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--ink)]">Executive decision card</div>
              <p className="mt-1 max-w-3xl text-sm leading-7 text-[var(--slate)]">
                Calm summary for GTM, growth, digital, and executive review.
              </p>
            </div>
            <Badge tone="success">Decision page</Badge>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <SnapshotCard
              title="Enterprise Risk"
              tone="critical"
              body={
                risk
                  ? `${risk.riskName} (${risk.severity}). ${risk.whyItMatters}`
                  : report.executiveVerdict
              }
              detail={journeyBlocker || report.inferredCompetitiveContext.categoryVisibilityRisk}
            />
            <SnapshotCard
              title="Business Consequence"
              tone="amber"
              body={businessConsequence}
              detail={report.inferredCompetitiveContext.categoryVisibilityRisk}
            />
            <SnapshotCard
              title="First-Week Move"
              tone="success"
              body={firstMove || "Start with the highest-leverage machine-facing clarity fix this week."}
              detail={risk?.suggestedFix || report.topFixes[0]?.whyItMatters}
            />
          </div>
        </div>
      </Card>
    </section>
  );
}

function SnapshotCard({
  title,
  body,
  detail,
  tone,
}: {
  title: string;
  body: string;
  detail?: string;
  tone: "success" | "amber" | "critical";
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/92 p-5">
      <div className="space-y-4">
        <Badge tone={tone}>{title}</Badge>
        <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">{body}</div>
        {detail ? <p className="text-sm leading-7 text-[var(--slate)]">{detail}</p> : null}
      </div>
    </div>
  );
}
