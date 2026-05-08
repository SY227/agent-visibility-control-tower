"use client";

import { useEffect, useRef, useState } from "react";

import { AgentWorkflowTrace } from "@/components/agent-workflow-trace";
import { HeroSection } from "@/components/hero-section";
import { ReadinessBrief } from "@/components/readiness-brief";
import { buildMarkdownBrief } from "@/lib/export";
import { SAMPLE_CASES } from "@/lib/sample-cases";
import type { AnalyzeResultPayload, ProgressEvent, WorkflowTraceItem } from "@/lib/types";
import { tryParseJson } from "@/lib/utils";

const DEFAULT_TRACE: WorkflowTraceItem[] = [
  {
    id: "website-context",
    label: "Website Context Agent",
    status: "pending",
    summary: "Waiting for a company URL.",
    evidenceCount: 0,
  },
  {
    id: "llm-perception",
    label: "LLM Perception Agent",
    status: "pending",
    summary: "Will model likely machine summary and category interpretation from public evidence.",
    evidenceCount: 0,
  },
  {
    id: "agent-visitor",
    label: "Agent Visitor Agent",
    status: "pending",
    summary: "Will assess buyer routing, evaluation clarity, and next-step action signals.",
    evidenceCount: 0,
  },
  {
    id: "aio-answer-engine",
    label: "AIO / Answer Engine Agent",
    status: "pending",
    summary: "Will assess answer-engine reuse, structure quality, and machine-readable positioning cues.",
    evidenceCount: 0,
  },
  {
    id: "citation-readiness",
    label: "Citation Readiness Agent",
    status: "pending",
    summary: "Will check whether claims, proof, and trust cues are packaged cleanly for citation.",
    evidenceCount: 0,
  },
  {
    id: "fix-prioritization",
    label: "Fix Prioritization Agent",
    status: "pending",
    summary: "Will rank distinct first-week actions and assemble the Fix Pack.",
    evidenceCount: 0,
  },
];

export function AgentVisibilityApp() {
  const [url, setUrl] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [workflowTrace, setWorkflowTrace] = useState<WorkflowTraceItem[]>(DEFAULT_TRACE);
  const [payload, setPayload] = useState<AnalyzeResultPayload | null>(null);
  const briefRef = useRef<HTMLDivElement | null>(null);

  function updateTrace(event: ProgressEvent) {
    setWorkflowTrace((current) =>
      current.map((item) =>
        item.id === event.agentId
          ? {
              ...item,
              status: event.status,
              summary: event.message,
              evidenceCount: event.evidenceCount ?? item.evidenceCount,
            }
          : item,
      ),
    );
  }

  async function runScan(nextUrl?: string) {
    const candidateUrl = (nextUrl ?? url).trim();
    if (!candidateUrl) return;

    setUrl(candidateUrl);
    setIsRunning(true);
    setPayload(null);
    setWorkflowTrace(DEFAULT_TRACE.map((item) => ({ ...item })));

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: candidateUrl }),
      });

      if (!response.body) {
        throw new Error("The analysis stream did not start.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const parsed = tryParseJson<
            | { type: "progress"; event: ProgressEvent }
            | { type: "result"; payload: AnalyzeResultPayload }
            | { type: "error"; error: string }
          >(part);

          if (!parsed) continue;

          if (parsed.type === "progress") {
            updateTrace(parsed.event);
          }

          if (parsed.type === "result") {
            setPayload(parsed.payload);
            setWorkflowTrace(parsed.payload.workflowTrace);
          }

          if (parsed.type === "error") {
            throw new Error(parsed.error);
          }
        }
      }
    } catch (scanError) {
      const message = scanError instanceof Error ? scanError.message : "The scan failed.";
      setWorkflowTrace((current) => {
        const hadRunningStep = current.some((item) => item.status === "running");

        if (!hadRunningStep) {
          return current.map((item, index) =>
            index === current.length - 1
              ? { ...item, status: "blocked", summary: message }
              : item,
          );
        }

        return current.map((item) =>
          item.status === "running"
            ? { ...item, status: "blocked", summary: message }
            : item,
        );
      });
    } finally {
      setIsRunning(false);
    }
  }

  async function copyMarkdown() {
    if (!payload) return;
    await navigator.clipboard.writeText(buildMarkdownBrief(payload.report));
  }

  useEffect(() => {
    if (!payload || !briefRef.current) return;

    const timer = window.setTimeout(() => {
      briefRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [payload]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-8 px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
          <HeroSection
            url={url}
            onUrlChange={setUrl}
            onSubmit={() => void runScan()}
            onSample={(sample) => void runScan(sample.url)}
            isRunning={isRunning}
            samples={SAMPLE_CASES}
          />
          <AgentWorkflowTrace items={workflowTrace} isRunning={isRunning} />
        </div>

        {payload ? (
          <div ref={briefRef} id="readiness-brief">
            <ReadinessBrief report={payload.report} onCopyMarkdown={() => void copyMarkdown()} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
