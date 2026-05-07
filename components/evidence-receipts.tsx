import { ArrowUpRight } from "lucide-react";

import { Card, SectionHeading } from "@/components/ui";
import type { EvidenceReceipt } from "@/lib/types";

export function EvidenceReceipts({ receipts }: { receipts: EvidenceReceipt[] }) {
  return (
    <section className="space-y-5">
      <SectionHeading
        eyebrow="Evidence Receipts"
        title="Source-backed signals only"
        description="Every receipt points to a real public page captured in the bounded scan. No invented citations, no fake live rankings."
      />

      {receipts.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {receipts.map((receipt) => (
            <Card key={`${receipt.sourceUrl}-${receipt.signal}`} className="p-5">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--ink)]">{receipt.sourceName}</div>
                    <a
                      href={receipt.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--green-deep)]"
                    >
                      {receipt.sourceUrl}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
                <div className="text-sm font-medium text-[var(--ink)]">{receipt.signal}</div>
                <p className="text-sm leading-6 text-[var(--slate)]">{receipt.whyItMatters}</p>
                <div className="rounded-[20px] bg-[var(--sage-soft)] px-4 py-3 text-sm leading-6 text-[var(--slate)]">
                  “{receipt.snippet}”
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-5">
          <p className="text-sm leading-6 text-[var(--slate)]">
            No source receipts were available for this run because the bounded crawl could not capture enough public pages.
          </p>
        </Card>
      )}
    </section>
  );
}
