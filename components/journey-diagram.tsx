"use client";

import { useEffect, useId, useState } from "react";

import { Card, SectionHeading } from "@/components/ui";

export function JourneyDiagram({
  mermaid,
  summary,
}: {
  mermaid: string;
  summary: string;
}) {
  const id = useId().replace(/:/g, "-");
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaidModule = await import("mermaid");
        const mermaidApi = mermaidModule.default;
        mermaidApi.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            fontFamily: "Geist, system-ui, sans-serif",
            primaryTextColor: "#152016",
            lineColor: "#6f7d70",
            clusterBkg: "#ffffff",
            clusterBorder: "#d4e7d7",
            mainBkg: "#ffffff",
          },
        });
        const { svg: rendered } = await mermaidApi.render(`journey-${id}`, mermaid);
        if (!cancelled) setSvg(rendered);
      } catch {
        if (!cancelled) setSvg(null);
      }
    }

    void render();

    return () => {
      cancelled = true;
    };
  }, [id, mermaid]);

  return (
    <section className="space-y-5">
      <SectionHeading
        eyebrow="Journey Diagram"
        title="How the agent path looks today"
        description="Green means strong, amber means partial, red means blocked or likely skipped."
      />

      <Card className="p-5 sm:p-6">
        <div className="space-y-4">
          {svg ? (
            <div className="overflow-x-auto rounded-[24px] bg-white p-3" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <pre className="overflow-x-auto rounded-[24px] bg-[var(--sage-soft)] p-4 text-xs leading-6 text-[var(--slate)]">
              {mermaid}
            </pre>
          )}
          <p className="text-sm leading-6 text-[var(--slate)]">{summary}</p>
        </div>
      </Card>
    </section>
  );
}
