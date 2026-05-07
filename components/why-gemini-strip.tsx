import { Badge, Card, SectionHeading } from "@/components/ui";

const PILLARS = [
  {
    title: "Gemini Flash",
    copy: "Used for fast, responsive agent workflows that keep the one-URL experience tight and demo-friendly.",
  },
  {
    title: "Structured outputs",
    copy: "Gemini output is constrained into typed artifacts and validated before the brief is rendered.",
  },
  {
    title: "Bounded orchestration",
    copy: "Six specialized Gemini-driven stages produce inspectable artifacts instead of open-ended chat sprawl.",
  },
  {
    title: "Enterprise reliability",
    copy: "Evidence-constrained outputs are favored over fake autonomy or uninspectable swarms. Gemini Pro can support deeper final synthesis later.",
  },
];

export function WhyGeminiStrip() {
  return (
    <section className="space-y-5">
      <SectionHeading
        eyebrow="Why Gemini"
        title="Why Gemini is central here"
        description="The architecture is intentionally bounded, typed, and inspectable so the workflow feels production-minded, not theatrical."
      />

      <Card className="p-5 sm:p-6">
        <div className="grid gap-3 xl:grid-cols-4">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className="rounded-[22px] border border-[var(--border)] bg-white/88 p-4">
              <div className="space-y-3">
                <Badge tone="success">{pillar.title}</Badge>
                <p className="text-sm leading-6 text-[var(--slate)]">{pillar.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
