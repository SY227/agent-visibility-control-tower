import { Badge, Card, SectionHeading } from "@/components/ui";
import type { VisibilityReport } from "@/lib/types";

export function GeminiOrchestrationSummary({ report }: { report: VisibilityReport }) {
  return (
    <section className="space-y-5">
      <SectionHeading
        eyebrow="Gemini Orchestration Summary"
        title="Bounded Gemini workflow"
        description="A visible, evidence-constrained orchestration layer with specialized stages and inspectable outputs, not a fake autonomous swarm."
      />

      <Card className="p-5 sm:p-6">
        <div className="space-y-4">
          <p className="max-w-4xl text-sm leading-7 text-[var(--slate)]">{report.geminiOrchestrationSummary.overview}</p>

          <div className="space-y-3">
            {report.geminiOrchestrationSummary.steps.map((step, index) => (
              <div key={`${step.agentName}-${index}`} className="rounded-[22px] border border-[var(--border)] bg-white/88 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--ink)]">{step.agentName}</div>
                    <p className="mt-2 text-sm leading-6 text-[var(--slate)]">{step.job}</p>
                  </div>
                  <Badge tone="success">{step.outputArtifact}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </section>
  );
}
