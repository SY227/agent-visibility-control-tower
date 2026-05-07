import { Badge, Card, SectionHeading } from "@/components/ui";
import type { VisibilityReport } from "@/lib/types";

function severityTone(severity: "High" | "Medium" | "Low") {
  if (severity === "High") return "critical" as const;
  if (severity === "Medium") return "amber" as const;
  return "success" as const;
}

export function MachineFacingGtmRisks({ report }: { report: VisibilityReport }) {
  return (
    <section className="space-y-5">
      <SectionHeading
        eyebrow="Machine-Facing GTM Risks"
        title="Where machine-side GTM breaks down first"
        description="A compact risk layer for how AI agents, LLMs, and answer engines may misclassify, hesitate, or misroute the company before a human buyer arrives."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {report.machineFacingGtmRisks.map((risk) => (
          <Card key={risk.riskName} className="p-5 sm:p-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">{risk.riskName}</div>
                <Badge tone={severityTone(risk.severity)}>{risk.severity}</Badge>
              </div>

              <div className="space-y-3">
                <div className="rounded-[20px] bg-white/88 px-4 py-3 text-sm leading-6 text-[var(--slate)]">
                  <span className="font-semibold text-[var(--ink)]">Why it matters: </span>
                  {risk.whyItMatters}
                </div>
                <div className="rounded-[20px] bg-[var(--sage-soft)]/72 px-4 py-3 text-sm leading-6 text-[var(--slate)]">
                  <span className="font-semibold text-[var(--ink)]">Suggested fix: </span>
                  {risk.suggestedFix}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
