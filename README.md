# Agent Visibility Control Tower

Agent Visibility Control Tower helps enterprises inspect and repair the machine-facing GTM layer, how AI agents, LLMs, and answer engines understand, cite, route, or skip a company before a human buyer ever clicks.

Built for the **Transforming Enterprise Through AI hackathon**, **Track 2: AI Agents with Google AI Studio**.

## Core product

**One URL in -> AI Visibility Readiness Brief + visible agent artifacts + Fix Pack + Before / After AI Perception Simulator out.**

The product preserves a single-URL intake and a bounded public-web scan. It does not require login, persistence, a second URL, or external system setup.

## Machine-facing GTM infrastructure, not a generic SEO audit

This is not a generic SEO audit.

It is machine-facing GTM infrastructure for the agent-mediated web.

The system focuses on how machines classify, summarize, cite, route, or skip a company, then turns that diagnosis into repair outputs.

It is built for the moment before a buyer clicks, when AI systems are already shaping perception and pathing.

## Shopper Schism

**Human visitors need persuasion.**

**AI visitors need structure, proof, clarity, and action paths.**

Agent Visibility Control Tower is built for that split. It highlights where brand and design may work for humans while machine-readable logic is still too thin.

## Product overview

Paste one company website URL.

The app reads a bounded set of public pages, then returns:

- an **AI Visibility Readiness Brief**
- **visible agent artifacts** from six specialized agent stages
- a **Fix Pack** with paste-ready machine-facing repair outputs
- a **Before / After AI Perception Simulator**
- a green / amber / red **journey diagram** of the current machine-side path

## Bounded Gemini agent workflow, not a fake autonomous swarm

This product does not pretend to be a fully autonomous swarm.

It uses a bounded Gemini agent workflow:

1. **Website Context Agent** -> Site facts captured
2. **LLM Perception Agent** -> Likely machine summary
3. **Agent Visitor Agent** -> Agent shopper journey blockers
4. **AIO / Answer Engine Agent** -> Answer-engine readiness findings
5. **Citation Readiness Agent** -> Evidence and proof gaps
6. **Fix Prioritization Agent** -> Fix Pack + top 5 actions

Each stage has a defined job.
Each stage produces a visible artifact.
The final output composes those artifacts into an executive brief and Fix Pack.

Enterprise reliability, latency, evidence constraints, and inspectable outputs matter more than performative autonomy.

## What the brief includes

The **AI Visibility Readiness Brief** includes:

- Executive Verdict
- score cards
- top machine-facing gap
- **Machine-Facing GTM Risks**
- **Inferred Competitive Context**
- visible agent artifacts
- existing readiness sections for LLM perception, answer-engine fit, citation readiness, and agent-readable logic
- journey diagram
- Fix Pack with workflow handoff copy buttons
- Before / After AI Perception Simulator
- evidence receipts
- **Gemini Orchestration Summary**
- limitations / confidence note

## New sections added in this version

### Machine-Facing GTM Risks

A compact executive risk layer with:

- Misclassification Risk
- Citation Weakness Risk
- Agent Journey Blocker
- Buyer Routing Risk
- Trust Gap

Each risk includes severity, why it matters, and a suggested fix.

### Inferred Competitive Context

A trust-safe, directional category and peer-context section inferred from public site signals only.

It includes:

- inferred category
- confidence label
- likely peer set
- competitive perception gap
- category visibility risk
- differentiation notes
- validation note

This is explicitly **not a verified market map** and does not claim official competitors or AI preference.

### Gemini Orchestration Summary

A small section that makes the Track 2 workflow obvious without exposing chain-of-thought.

It shows the bounded Gemini workflow, each stage's job, and each visible output artifact.

### Workflow handoff copy buttons

The Fix Pack includes copy-to-clipboard buttons for:

- Executive Summary
- Content Team
- Engineering
- GTM Risk Summary

These are copy helpers only. There is no Jira, Slack, Notion, or external integration in the current version.

## Fix Pack contents

The Fix Pack is intentionally repair-oriented, not generic recommendation theater.

It includes:

1. **AI-readable homepage summary block**
2. **Answer-engine FAQ block** with 5 concise items
3. **Citation-ready proof block** that tightens vague claims into more citeable formats
4. **Agent action-path copy** for pricing, demo/request, enterprise evaluation, and docs routing
5. **Structured data / schema plan** for the highest-signal pages

## Why Gemini

Gemini is the synthesis engine behind the brief, the visible artifacts, the Fix Pack, the inferred competitive context, and the directional perception simulator.

It fits this product because it can:

- compose bounded public-web evidence into structured JSON
- preserve evidence-constrained output shapes
- support a multi-stage, inspectable workflow
- produce executive-readable synthesis without pretending to be an unbounded autonomous system

Model configuration is environment-based:

```ts
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
```

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>

## Environment variables

Required:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Optional model override:

```bash
GEMINI_MODEL=gemini-flash-latest
```

Do not commit `.env.local` or any secrets.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run start
```

## Guardrails

- preserve the calm enterprise visual design
- no fake autonomy
- no fake sources
- no verified competitor claims
- no full competitor crawl
- no chain-of-thought exposure
- no secrets in client code
- no edits to `.env.local`

## Limitations

- This is a directional public-page read, not a formal SEO audit.
- It does not claim certainty about closed-model rankings, answer-surface treatment, or citation behavior.
- Competitive context is inferred from public site signals and is not a verified market map.
- The Before / After AI Perception Simulator is a projected interpretation model, not a guarantee.
- It only uses accessible public pages gathered in a bounded crawl.
- Some sites may block or limit fetch access, which lowers confidence.

## Roadmap

- future full competitor side-by-side scan while preserving the current one-URL intake for the present version
- snapshot diffing across repeated scans
- stronger schema classification
- optional browser-render fallback for heavily JS-driven sites
- team sharing and saved briefs
