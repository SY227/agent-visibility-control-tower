import type { ReactNode } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";

import { Badge, Button, Card, Input } from "@/components/ui";
import type { SampleCase } from "@/lib/types";

export function HeroSection({
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
    <Card className="flex h-full min-h-[760px] flex-col overflow-hidden p-6 sm:p-7">
      <div className="space-y-4">
        <Badge tone="success" className="w-fit">
          Agent Visibility Control Tower
        </Badge>

        <div className="space-y-3">
          <h1 className="max-w-[10ch] text-[40px] font-semibold leading-[0.95] tracking-[-0.07em] text-[var(--ink)] sm:text-[50px] lg:text-[56px]">
            Your next visitor isn’t human.
          </h1>
          <p className="max-w-2xl text-[16px] leading-7 text-[var(--slate)] sm:text-[17px]">
            Inspect and repair how AI agents, LLMs, and answer engines understand, cite, route, or skip your company.
          </p>
          <p className="max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-[15px]">
            Paste one website URL. The system reads a bounded set of public pages and returns an AI Visibility Readiness Brief, visible agent artifacts, a Fix Pack, and a directional before/after AI perception simulator.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SignalCard
            title="Low friction"
            copy="One required input only, the company website URL. No setup tax."
            icon={<Sparkles className="h-4 w-4" />}
          />
          <SignalCard
            title="Executive-ready"
            copy="Built to produce a calm, judge-inspectable executive artifact instead of a noisy audit dump."
            icon={<Sparkles className="h-4 w-4" />}
          />
          <SignalCard
            title="Machine-facing GTM"
            copy="Focused on machine-facing GTM infrastructure, not a generic SEO audit, with repair outputs included."
            icon={<Sparkles className="h-4 w-4" />}
          />
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-white/82 p-4 sm:p-5">
        <div className="space-y-4">
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

          <div className="space-y-2.5">
            <div className="text-sm font-medium text-[var(--ink)]">Sample cases</div>
            <div className="grid gap-2.5">
              {samples.map((sample) => (
                <button
                  key={sample.url}
                  type="button"
                  onClick={() => onSample(sample)}
                  disabled={isRunning}
                  className="rounded-[18px] border border-[var(--border)] bg-[var(--sage-soft)]/55 px-3.5 py-3 text-left transition hover:border-[rgba(62,143,92,0.24)] hover:bg-[var(--sage-soft)] disabled:opacity-60"
                >
                  <div className="text-sm font-semibold text-[var(--ink)]">{sample.name}</div>
                  <div className="mt-0.5 text-xs text-[var(--green-deep)]">{sample.url}</div>
                  <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">{sample.note}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SignalCard({
  title,
  copy,
  icon,
}: {
  title: string;
  copy: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-white/80 p-3.5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[var(--green-soft)] text-[var(--green-deep)]">
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold text-[var(--ink)]">{title}</div>
          <p className="mt-1 text-[13px] leading-5 text-[var(--muted)]">{copy}</p>
        </div>
      </div>
    </div>
  );
}
