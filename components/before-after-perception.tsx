import { Badge, Card, SectionHeading } from "@/components/ui";
import type { BeforeAfterPerception as BeforeAfterPerceptionType } from "@/lib/types";

export function BeforeAfterPerceptionSimulator({
  perception,
}: {
  perception: BeforeAfterPerceptionType;
}) {
  return (
    <section className="space-y-5">
      <SectionHeading
        eyebrow="Before / After AI Perception Simulator"
        title="Directional perception comparison"
        description="A careful simulation of how public-site interpretation may change if the proposed Fix Pack is implemented. This is directional, not a guarantee of ranking or citation behavior."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">Current likely AI / LLM summary</div>
              <Badge tone="amber">Current</Badge>
            </div>
            <p className="text-sm leading-7 text-[var(--slate)]">{perception.currentLikelySummary}</p>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">Improved likely AI / LLM summary</div>
              <Badge tone="success">Projected</Badge>
            </div>
            <p className="text-sm leading-7 text-[var(--slate)]">{perception.improvedLikelySummary}</p>
          </div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="space-y-4">
          <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">What changed</div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {perception.whatChanged.map((item) => (
              <div key={item} className="rounded-[20px] bg-[var(--sage-soft)] px-4 py-3 text-sm leading-6 text-[var(--slate)]">
                {item}
              </div>
            ))}
          </div>
          <div className="rounded-[22px] border border-[rgba(209,165,66,0.18)] bg-[var(--amber-soft)] px-4 py-3 text-sm leading-6 text-[var(--slate)]">
            This simulator shows projected interpretation changes based on the proposed content and structure improvements. It does not predict guaranteed ranking lift, guaranteed citations, or definite future answer-surface behavior.
          </div>
        </div>
      </Card>
    </section>
  );
}
