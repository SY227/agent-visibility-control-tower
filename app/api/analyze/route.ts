import { analyzeRequestSchema, analyzeResultSchema } from "@/lib/schema";
import { generateVisibilityReport } from "@/lib/gemini";
import { buildCompletionEvent, buildWorkflowTrace } from "@/lib/report-helpers";
import { scanSite } from "@/lib/site-fetch";
import type { ProgressEvent, WorkflowAgentId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function line(payload: unknown) {
  return new TextEncoder().encode(`${JSON.stringify(payload)}\n`);
}

async function emitProgress(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  event: ProgressEvent,
) {
  await writer.write(line({ type: "progress", event }));
}

async function emitAgentLifecycle(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  agentId: WorkflowAgentId,
  message: string,
  evidenceCount: number,
) {
  await emitProgress(writer, {
    agentId,
    status: "running",
    message,
    evidenceCount,
  });
}

export async function POST(request: Request) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  void (async () => {
    try {
      const json = await request.json();
      const parsed = analyzeRequestSchema.safeParse(json);

      if (!parsed.success) {
        await writer.write(line({ type: "error", error: "Enter a valid company website URL." }));
        return;
      }

      await emitProgress(writer, {
        agentId: "website-context",
        status: "running",
        message: "Reading homepage, sitemap, and high-signal internal pages.",
      });

      const scan = await scanSite(parsed.data.url);
      const evidenceCount = scan.pages.length;

      await emitProgress(writer, {
        agentId: "website-context",
        status: scan.pages.length ? "completed" : "blocked",
        message: scan.pages.length
          ? `Captured ${scan.pages.length} public pages for evidence review.`
          : "Public page fetch was limited from this environment.",
        evidenceCount,
      });

      await emitAgentLifecycle(
        writer,
        "llm-perception",
        "Modeling likely machine summaries from the captured public signals.",
        evidenceCount,
      );

      const report = await generateVisibilityReport(scan);

      await emitProgress(writer, buildCompletionEvent(report, "website-context", evidenceCount));
      await emitProgress(writer, buildCompletionEvent(report, "llm-perception", evidenceCount));

      await emitAgentLifecycle(
        writer,
        "agent-visitor",
        "Checking whether an AI agent can understand the buyer path and next action.",
        evidenceCount,
      );
      await emitProgress(writer, buildCompletionEvent(report, "agent-visitor", evidenceCount));

      await emitAgentLifecycle(
        writer,
        "aio-answer-engine",
        "Assessing answer-engine interpretation, strengths, and structural weaknesses.",
        evidenceCount,
      );
      await emitProgress(writer, buildCompletionEvent(report, "aio-answer-engine", evidenceCount));

      await emitAgentLifecycle(
        writer,
        "citation-readiness",
        "Reviewing evidence density, proof packaging, and trust gaps.",
        evidenceCount,
      );
      await emitProgress(writer, buildCompletionEvent(report, "citation-readiness", evidenceCount));

      await emitAgentLifecycle(
        writer,
        "fix-prioritization",
        "Building the Fix Pack, ranking the top actions, and simulating projected perception changes.",
        evidenceCount,
      );
      await emitProgress(writer, buildCompletionEvent(report, "fix-prioritization", evidenceCount));

      const workflowTrace = buildWorkflowTrace(report, evidenceCount);
      const payload = analyzeResultSchema.parse({
        report,
        workflowTrace,
        scanSummary: {
          normalizedUrl: scan.normalizedUrl,
          pagesAnalyzed: scan.facts.pagesAnalyzed,
          pagesDiscovered: scan.facts.pagesDiscovered,
          pageTypes: scan.facts.pageTypes,
          limitations: scan.limitations,
        },
      });

      await writer.write(line({ type: "result", payload }));
    } catch (error) {
      await writer.write(
        line({
          type: "error",
          error: error instanceof Error ? error.message : "Analysis failed.",
        }),
      );
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
