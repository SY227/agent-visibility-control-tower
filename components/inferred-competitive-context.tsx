import { Badge, Card, SectionHeading } from "@/components/ui";
import type { VisibilityReport } from "@/lib/types";

function confidenceTone(confidence: "High" | "Medium" | "Low") {
  if (confidence === "High") return "success" as const;
  if (confidence === "Medium") return "amber" as const;
  return "neutral" as const;
}

export function InferredCompetitiveContext({ report }: { report: VisibilityReport }) {
  const context = report.inferredCompetitiveContext;

  return (
    <section className="space-y-5">
      <SectionHeading
        eyebrow="Inferred Competitive Context"
        title="Directional category and peer context"
        description="Likely competitive context inferred from public site signals only. Compact, confidence-labeled, and explicitly not a verified market map."
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">Likely category</div>
                <p className="mt-2 text-sm leading-7 text-[var(--slate)]">{context.inferredCategory}</p>
              </div>
              <Badge tone={confidenceTone(context.categoryConfidence)}>{context.categoryConfidence} confidence</Badge>
            </div>

            <div className="space-y-3">
              <div className="rounded-[20px] bg-white/88 px-4 py-3 text-sm leading-6 text-[var(--slate)]">
                <span className="font-semibold text-[var(--ink)]">Competitive perception gap: </span>
                {context.competitivePerceptionGap}
              </div>
              <div className="rounded-[20px] bg-[var(--amber-soft)] px-4 py-3 text-sm leading-6 text-[var(--slate)]">
                <span className="font-semibold text-[var(--ink)]">Category visibility risk: </span>
                {context.categoryVisibilityRisk}
              </div>
              <div className="rounded-[20px] bg-[var(--sage-soft)]/72 px-4 py-3 text-sm leading-6 text-[var(--slate)]">
                <div className="font-semibold text-[var(--ink)]">Differentiation notes</div>
                <div className="mt-2 space-y-2">
                  {context.differentiationNotes.map((item) => (
                    <div key={item}>{item}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">Likely peer set</div>
            <div className="space-y-3">
              {context.likelyPeerSet.map((peer) => (
                <div key={`${peer.name}-${peer.confidence}`} className="rounded-[22px] border border-[var(--border)] bg-white/88 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="text-sm font-semibold text-[var(--ink)]">{peer.name}</div>
                    <Badge tone={confidenceTone(peer.confidence)}>{peer.confidence}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--slate)]">{peer.whyInferred}</p>
                </div>
              ))}
            </div>
            <div className="rounded-[20px] bg-[var(--green-soft)]/72 px-4 py-3 text-sm leading-6 text-[var(--slate)]">
              {context.validationNote}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
