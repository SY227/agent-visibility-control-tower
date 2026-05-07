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

  async function copy(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1400);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <CopyButton
        label="Copy Executive Summary"
        copied={copiedKey === "executive"}
        onClick={() => void copy("executive", buildExecutiveSummaryCopy(report))}
      />
      <CopyButton
        label="Copy for Content Team"
        copied={copiedKey === "content"}
        onClick={() => void copy("content", buildContentTeamCopy(report))}
      />
      <CopyButton
        label="Copy for Engineering"
        copied={copiedKey === "engineering"}
        onClick={() => void copy("engineering", buildEngineeringCopy(report))}
      />
      {gtmRiskSummary ? (
        <CopyButton
          label="Copy GTM Risk Summary"
          copied={copiedKey === "gtm-risk"}
          onClick={() => void copy("gtm-risk", gtmRiskSummary)}
        />
      ) : null}
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
    <Button variant="secondary" onClick={onClick} className="rounded-full px-3.5 py-2 text-xs sm:text-sm">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}
