import { WorkflowHandoffButtons } from "@/components/workflow-handoff-buttons";
import { Badge, Card, SectionHeading } from "@/components/ui";
import type { VisibilityReport } from "@/lib/types";

export function FixPackSection({ report }: { report: VisibilityReport }) {
  return (
    <section className="space-y-5">
      <SectionHeading
        eyebrow="Fix Pack"
        title="Repair the machine-facing GTM layer"
        description="Not just diagnosis. This pack turns the strongest findings into paste-ready repair outputs for homepage clarity, answer surfaces, proof, next-step routing, and schema reinforcement."
      />

      <Card className="p-5 sm:p-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">What to do first this week</div>
              <p className="mt-2 text-sm leading-7 text-[var(--slate)]">{report.fixPrioritizationArtifact.firstWeekFocus}</p>
            </div>
            <Badge tone="success">Paste-ready outputs</Badge>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Handoff-Ready Workstreams
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--slate)]">
                Copy clean workstream-ready outputs for the teams that need to repair the machine-facing GTM layer.
              </p>
            </div>
            <WorkflowHandoffButtons report={report} />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {report.fixPrioritizationArtifact.topActions.map((action, index) => (
              <div key={`${action.action}-${index}`} className="rounded-[22px] border border-[var(--border)] bg-white/88 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="success">#{index + 1}</Badge>
                  <Badge tone={action.impact === "High" ? "success" : action.impact === "Medium" ? "amber" : "neutral"}>
                    {action.impact} impact
                  </Badge>
                  <Badge tone={action.effort === "Low" ? "success" : action.effort === "Medium" ? "amber" : "critical"}>
                    {action.effort} effort
                  </Badge>
                </div>
                <div className="mt-3 text-sm font-semibold text-[var(--ink)]">{action.action}</div>
                <p className="mt-2 text-sm leading-6 text-[var(--slate)]">{action.whyItMatters}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">AI-readable homepage summary block</div>
            <div className="rounded-[22px] border border-[rgba(62,143,92,0.14)] bg-[var(--green-soft)]/70 p-4 text-sm leading-7 text-[var(--slate)]">
              {report.fixPack.homepageSummaryBlock}
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">Structured data / schema plan</div>
            <div className="space-y-3">
              {report.fixPack.schemaPlan.map((item) => (
                <div key={item} className="rounded-[20px] bg-white/88 px-4 py-3 text-sm leading-6 text-[var(--slate)]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">Answer-engine FAQ block</div>
            <div className="space-y-3">
              {report.fixPack.faqBlock.map((item) => (
                <div key={item.question} className="rounded-[22px] border border-[var(--border)] bg-white/88 p-4">
                  <div className="text-sm font-semibold text-[var(--ink)]">{item.question}</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--slate)]">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">Citation-ready proof block</div>
            <div className="space-y-3">
              {report.fixPack.citationReadyProofBlock.map((item) => (
                <div key={item} className="rounded-[20px] bg-[var(--amber-soft)] px-4 py-3 text-sm leading-6 text-[var(--slate)]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="space-y-4">
          <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">Agent action-path copy</div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {report.fixPack.agentActionPathCopy.map((item) => (
              <div key={item.label} className="rounded-[22px] border border-[var(--border)] bg-white/88 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--green-deep)]">
                  {item.label}
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--slate)]">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </section>
  );
}
