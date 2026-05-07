import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, CircleDashed, LoaderCircle } from "lucide-react";

import { Badge, Card } from "@/components/ui";
import type { WorkflowTraceItem } from "@/lib/types";
import { cn } from "@/lib/utils";

function statusTone(status: WorkflowTraceItem["status"]) {
  if (status === "completed") return "success" as const;
  if (status === "running") return "sage" as const;
  if (status === "blocked") return "critical" as const;
  return "neutral" as const;
}

function StatusIcon({ status }: { status: WorkflowTraceItem["status"] }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-[var(--green-deep)]" />;
  if (status === "running") return <LoaderCircle className="h-4 w-4 animate-spin text-[var(--green-deep)]" />;
  if (status === "blocked") return <AlertCircle className="h-4 w-4 text-[#9b4d41]" />;
  return <CircleDashed className="h-4 w-4 text-[var(--muted)]" />;
}

const summaryClampStyle = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
};

export function AgentWorkflowTrace({
  items,
  isRunning,
}: {
  items: WorkflowTraceItem[];
  isRunning: boolean;
}) {
  const [dotIndex, setDotIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState<Record<string, number>>({});
  const previousStatuses = useRef<Record<string, WorkflowTraceItem["status"]>>({});
  const loadingDots = [".", "..", "..."][dotIndex] ?? ".";

  const runningIds = useMemo(
    () => items.filter((item) => item.status === "running").map((item) => item.id),
    [items],
  );

  useEffect(() => {
    if (!isRunning) return;

    const timer = window.setInterval(() => {
      setDotIndex((current) => (current + 1) % 3);
    }, 420);

    return () => window.clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    setStepProgress((current) => {
      const next = { ...current };

      for (const item of items) {
        const previousStatus = previousStatuses.current[item.id];

        if (item.status === "pending") {
          next[item.id] = 0;
          continue;
        }

        if (item.status === "running") {
          next[item.id] = previousStatus === "running" ? next[item.id] ?? 0 : 0;
          continue;
        }

        if (item.status === "completed") {
          next[item.id] = 100;
          continue;
        }

        if (item.status === "blocked") {
          next[item.id] = Math.max(next[item.id] ?? 0, previousStatus === "running" ? next[item.id] ?? 0 : 0);
        }
      }

      return next;
    });

    previousStatuses.current = Object.fromEntries(items.map((item) => [item.id, item.status]));
  }, [items]);

  useEffect(() => {
    if (!runningIds.length) return;

    const timer = window.setInterval(() => {
      setStepProgress((current) => {
        const next = { ...current };

        for (const id of runningIds) {
          const value = next[id] ?? 0;
          const increment = value < 18 ? 9 : value < 40 ? 7 : value < 62 ? 5 : value < 82 ? 3 : 1;
          next[id] = Math.min(99, value + increment);
        }

        return next;
      });
    }, 320);

    return () => window.clearInterval(timer);
  }, [runningIds]);

  return (
    <Card className="flex h-full min-h-[760px] flex-col overflow-hidden p-6 sm:p-7">
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--green-deep)]">Agent Workflow Trace</div>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-3xl">
          Visible machine-side workflow
        </h2>
        <p className="max-w-3xl text-sm leading-7 text-[var(--slate)] sm:text-[15px]">
          Compact bounded Gemini orchestration trace. Detailed agent artifacts appear in the brief below.
        </p>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 space-y-3">
        {items.map((item, index) => {
          const isRunningStep = item.status === "running";
          const isCompletedStep = item.status === "completed";
          const isBlockedStep = item.status === "blocked";
          const progress = Math.round(stepProgress[item.id] ?? 0);

          return (
            <div
              key={item.id}
              className={cn(
                "rounded-[22px] border px-4 py-3",
                isCompletedStep && "border-[rgba(62,143,92,0.14)] bg-[var(--green-soft)]/70",
                isRunningStep && "border-[rgba(141,187,149,0.2)] bg-[var(--sage-soft)]",
                isBlockedStep && "border-[rgba(201,105,90,0.18)] bg-[var(--red-soft)]",
                item.status === "pending" && "border-[var(--border)] bg-white/80",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  <StatusIcon status={item.status} />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--ink)]">
                        {index + 1}. {item.label}
                        {isRunningStep ? loadingDots : ""}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--muted)]">Evidence found: {item.evidenceCount}</div>
                    </div>
                    <Badge tone={statusTone(item.status)}>
                      {isRunningStep ? `Running${loadingDots}` : isCompletedStep ? "Ready" : isBlockedStep ? "Limited" : "Queued"}
                    </Badge>
                  </div>

                  <p className="text-sm leading-6 text-[var(--slate)]" style={summaryClampStyle}>
                    {item.summary}
                  </p>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                      <span>
                        {isRunningStep
                          ? `Step progress${loadingDots}`
                          : isCompletedStep
                            ? "Step complete"
                            : isBlockedStep
                              ? "Step limited"
                              : "Waiting"}
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/70">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isCompletedStep && "bg-[var(--green)]",
                          isRunningStep && "bg-[linear-gradient(90deg,var(--green-soft),var(--green),var(--green-soft))]",
                          isBlockedStep && "bg-[var(--red)]",
                          item.status === "pending" && "bg-[rgba(141,187,149,0.4)]",
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 h-5 text-right text-xs text-[var(--muted)]">
        {!isRunning && items.some((item) => item.status === "completed") ? (
          <a href="#agent-artifacts" className="transition hover:text-[var(--green-deep)]">
            View artifacts below
          </a>
        ) : null}
      </div>
    </Card>
  );
}
