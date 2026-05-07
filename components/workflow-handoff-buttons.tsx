"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui";
import {
  buildContentTeamCopy,
  buildEngineeringCopy,
  buildExecutiveSummaryCopy,
  buildGtmRiskSummaryCopy,
} from "@/lib/handoff-copy";
import type { VisibilityReport } from "@/lib/types";

export function WorkflowHandoffButtons({ report }: { report: VisibilityReport }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const gtmRiskSummary = buildGtmRiskSummaryCopy(report);
  const workstreams = [
    {
      key: "executive",
      title: "Executive Review",
      description: "Forwardable decision summary for leadership review and prioritization.",
      value: buildExecutiveSummaryCopy(report),
    },
    {
      key: "content",
      title: "Content Team",
      description: "Homepage, FAQ, and proof-language repairs for answer-engine readiness.",
      value: buildContentTeamCopy(report),
    },
    {
      key: "engineering",
      title: "Engineering",
      description: "Schema, structure, and machine-readable pathing workstream.",
      value: buildEngineeringCopy(report),
    },
    {
      key: "gtm-risk",
      title: "GTM Risk Summary",
      description: "Compact machine-facing GTM risk handoff for cross-functional review.",
      value: gtmRiskSummary,
    },
  ].filter((item) => item.value);

  async function copy(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1400);
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {workstreams.map((item) => (
        <div key={item.key} className="rounded-[22px] border border-[var(--border)] bg-white/88 p-4">
          <div className="space-y-3">
            <div>
              <div className="text-sm font-semibold text-[var(--ink)]">{item.title}</div>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.description}</p>
            </div>
            <CopyButton
              label="Copy workstream"
              copied={copiedKey === item.key}
              onClick={() => void copy(item.key, item.value)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CopyButton({
  label,
  copied,
  onClick,
}: {
  label: string;
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <Button variant="secondary" onClick={onClick} className="w-full justify-center rounded-full px-3.5 py-2 text-xs sm:text-sm">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}
