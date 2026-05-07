import { LoaderCircle, Sparkles } from "lucide-react";

import { Button, Card, Input } from "@/components/ui";
import type { SampleCase } from "@/lib/types";

export function UrlIntakeCard({
  url,
  onUrlChange,
  onSubmit,
  onSample,
  isRunning,
  samples,
}: {
  url: string;
  onUrlChange: (value: string) => void;
  onSubmit: () => void;
  onSample: (sample: SampleCase) => void;
  isRunning: boolean;
  samples: SampleCase[];
}) {
  return (
    <Card className="p-6 sm:p-7">
      <div className="space-y-5">
        <div>
          <div className="text-sm font-semibold tracking-[-0.02em] text-[var(--ink)]">Run Visibility Scan</div>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            One input only. No login, no documents, no setup tax.
          </p>
        </div>

        <label className="space-y-2">
          <div className="text-sm font-medium text-[var(--ink)]">Company website URL</div>
          <Input
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="https://www.shopify.com"
            onKeyDown={(event) => {
              if (event.key === "Enter") onSubmit();
            }}
          />
        </label>

        <Button onClick={onSubmit} disabled={isRunning || !url.trim()} className="w-full">
          {isRunning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Run Visibility Scan
        </Button>

        <div className="space-y-3">
          <div className="text-sm font-medium text-[var(--ink)]">Sample cases</div>
          <div className="grid gap-3">
            {samples.map((sample) => (
              <button
                key={sample.url}
                type="button"
                onClick={() => onSample(sample)}
                disabled={isRunning}
                className="text-left rounded-[22px] border border-[var(--border)] bg-white/88 px-4 py-3 transition hover:border-[rgba(62,143,92,0.24)] hover:bg-[var(--sage-soft)] disabled:opacity-60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--ink)]">{sample.name}</div>
                    <div className="mt-1 text-xs text-[var(--green-deep)]">{sample.url}</div>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{sample.note}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
