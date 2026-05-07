import { Card, SectionHeading } from "@/components/ui";

const RUBRIC = [
  {
    title: "Application of Technology",
    copy: "Gemini powers the bounded six-stage agent workflow, structured JSON synthesis, visible intermediate artifacts, Machine-Facing GTM Risks, Fix Pack generation, and the Before / After AI Perception Simulator.",
  },
  {
    title: "Presentation",
    copy: "One URL input, visible workflow trace, boardroom-ready brief, executive snapshot, and handoff-ready workstreams keep the demo legible in under a minute.",
  },
  {
    title: "Business Value",
    copy: "Enterprises risk being misunderstood, skipped, weakly cited, or misrouted by AI agents and answer engines before human buyers ever reach the website.",
  },
  {
    title: "Originality",
    copy: "Most SEO tools optimize for search crawlers. This product audits and repairs how AI agents, LLMs, and answer engines understand, cite, route, or skip a company.",
  },
];

export function JudgeRubricSnapshot() {
  return (
    <section className="space-y-5">
      <SectionHeading
        eyebrow="Why this fits the challenge"
        title="Judging criteria, directly mapped"
        description="Concise challenge-fit summary for a judge reviewing product, workflow, and business relevance side by side."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {RUBRIC.map((item) => (
          <Card key={item.title} className="p-5">
            <div className="space-y-3">
              <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">{item.title}</div>
              <p className="text-sm leading-7 text-[var(--slate)]">{item.copy}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
