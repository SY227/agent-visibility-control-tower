import { Badge, Card } from "@/components/ui";
import { scoreTone } from "@/lib/utils";

export function VisibilityScoreCard({
  label,
  score,
  detail,
}: {
  label: string;
  score: number;
  detail: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-[var(--muted)]">{label}</div>
          <div className="mt-2 text-4xl font-semibold tracking-[-0.08em] text-[var(--ink)]">{score}</div>
        </div>
        <Badge tone={scoreTone(score)}>{score >= 76 ? "Strong" : score >= 61 ? "Mixed" : score >= 41 ? "Emerging" : "Weak"}</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--slate)]">{detail}</p>
    </Card>
  );
}
