import { Badge, Card, SectionHeading } from "@/components/ui";
import type { VisibilityReport } from "@/lib/types";

export function AgentArtifactCards({ report }: { report: VisibilityReport }) {
  const artifacts = [
    {
      agent: "Website Context Agent",
      title: "Site facts captured",
      lead: report.websiteContextArtifact.mainOffering,
      sections: [
        { label: "Category", items: [report.websiteContextArtifact.companyCategory] },
        { label: "Audience", items: [report.websiteContextArtifact.likelyAudience] },
        { label: "Key pages found", items: report.websiteContextArtifact.keyPagesFound },
        { label: "Proof signals found", items: report.websiteContextArtifact.proofSignalsFound },
        { label: "Missing basics", items: report.websiteContextArtifact.missingBasics },
      ],
    },
    {
      agent: "LLM Perception Agent",
      title: "Likely machine summary",
      lead: report.llmPerceptionArtifact.likelySummary,
      sections: [
        { label: "Positioning interpretation", items: [report.llmPerceptionArtifact.positioningInterpretation] },
        { label: "Possible misreadings", items: report.llmPerceptionArtifact.possibleMisreadings },
      ],
    },
    {
      agent: "Agent Visitor Agent",
      title: "Agent shopper journey blockers",
      sections: [
        { label: "What an AI agent can understand", items: report.agentVisitorArtifact.whatAgentsCanUnderstand },
        { label: "Journey blockers", items: report.agentVisitorArtifact.journeyBlockers },
        { label: "Actionability gaps", items: report.agentVisitorArtifact.actionabilityGaps },
      ],
    },
    {
      agent: "AIO / Answer Engine Agent",
      title: "Answer-engine readiness findings",
      sections: [
        { label: "Strengths", items: report.aioArtifact.strengths },
        { label: "Weaknesses", items: report.aioArtifact.weaknesses },
        { label: "AIO observations", items: report.aioArtifact.answerEngineObservations },
        { label: "Content structure issues", items: report.aioArtifact.contentStructureIssues },
      ],
    },
    {
      agent: "Citation Readiness Agent",
      title: "Evidence and proof gaps",
      sections: [
        { label: "Strong claims", items: report.citationArtifact.strongClaims },
        { label: "Weak claims", items: report.citationArtifact.weakClaims },
        { label: "Proof gaps", items: report.citationArtifact.proofGaps },
        { label: "Trust gaps", items: report.citationArtifact.trustGaps },
      ],
    },
    {
      agent: "Fix Prioritization Agent",
      title: "Fix Pack + top 5 actions",
      lead: report.fixPrioritizationArtifact.firstWeekFocus,
      sections: [
        {
          label: "Top 5 actions",
          items: report.fixPrioritizationArtifact.topActions.map(
            (item) => `${item.action} (${item.impact} impact, ${item.effort} effort)`,
          ),
        },
        { label: "Fix Pack components", items: report.fixPrioritizationArtifact.fixPackSummary },
      ],
    },
  ];

  return (
    <section id="agent-artifacts" className="space-y-5">
      <SectionHeading
        eyebrow="Visible Agent Artifacts"
        title="What each agent actually produced"
        description="Compact intermediate outputs make the workflow feel like status plus output, not status alone."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {artifacts.map((artifact) => (
          <Card key={artifact.title} className="p-5 sm:p-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">{artifact.title}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--green-deep)]">{artifact.agent}</div>
                </div>
                <Badge tone="success">Artifact ready</Badge>
              </div>

              {artifact.lead ? <p className="text-sm leading-7 text-[var(--slate)]">{artifact.lead}</p> : null}

              <div className="space-y-3">
                {artifact.sections.map((section, sectionIndex) => (
                  <div key={`${artifact.title}-${section.label}-${sectionIndex}`} className="rounded-[22px] border border-[var(--border)] bg-white/88 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      {section.label}
                    </div>
                    <div className="mt-3 space-y-2.5">
                      {section.items.map((item, itemIndex) => (
                        <div
                          key={`${artifact.title}-${section.label}-${sectionIndex}-${itemIndex}`}
                          className="rounded-[18px] bg-[var(--sage-soft)]/72 px-3.5 py-3 text-sm leading-6 text-[var(--slate)]"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
