# Agent Visibility Control Tower

Agent Visibility Control Tower is a Gemini-powered executive workbench for the agent-mediated web. It helps enterprises inspect and repair the machine-facing GTM layer, what AI agents, LLMs, and answer engines understand, cite, route, or skip before a human buyer ever clicks.

Built for the **Transforming Enterprise Through AI hackathon**, **Track 2: AI Agents with Google AI Studio**.

## Core product

**One URL in -> boardroom-ready AI Visibility Brief + visible agent artifacts + Fix Pack + Before / After AI Perception Simulator out.**

The product preserves a single-URL intake and a bounded public-web scan. It does not require login, persistence, a second URL, or external system setup.

## What problem this solves

On the agent-mediated web, the next visitor may be an AI system long before it is a human buyer.

That machine visitor may:

- misclassify the company
- skip key proof
- miss the right buyer path
- fail to cite the business confidently
- flatten differentiation into a generic category label

Agent Visibility Control Tower is built to inspect that machine-facing layer, then turn the findings into repair outputs a real enterprise team can use.

## Not a generic SEO audit

This is not a generic SEO or crawler audit.

It is machine-facing GTM infrastructure for the moment before a click, when AI systems are already shaping perception, routing, and commercial visibility.

## Executive use case

- **For GTM and growth teams:** identify machine-facing visibility gaps.
- **For digital teams:** repair AIO, agent-readability, and citation readiness.
- **For content teams:** generate answer-engine-ready copy and FAQ blocks.
- **For engineering teams:** identify schema and structured-data workstreams.
- **For executives:** understand enterprise risk, business consequence, and first-week action.

## Product flow

Paste one company website URL.

The app reads a bounded set of public pages, then returns:

- an **AI Visibility Readiness Brief**
- a **Boardroom Snapshot** and **Decision Memo**
- **Machine-Facing GTM Risks**
- **Inferred Competitive Context**
- a **Fix Pack** with handoff-ready workstreams
- a **Before / After AI Perception Simulator**
- **Evidence Receipts**
- a **Gemini Orchestration Summary**
- visible agent artifacts from each stage in the workflow

## Bounded Gemini workflow

This product does not pretend to be a fully autonomous swarm.

It uses a bounded Gemini workflow with six specialized stages:

1. **Website Context Agent** -> site facts captured
2. **LLM Perception Agent** -> likely machine summary
3. **Agent Visitor Agent** -> agent shopper journey blockers
4. **AIO / Answer Engine Agent** -> answer-engine readiness findings
5. **Citation Readiness Agent** -> evidence and proof gaps
6. **Fix Prioritization Agent** -> Fix Pack + top 5 actions

Each stage has a defined job.
Each stage produces a visible artifact.
The final output composes those artifacts into an executive brief.

## Why Gemini

Gemini is central because the product needs bounded orchestration, structured synthesis, and fast enterprise-readable outputs.

- **Gemini Flash** supports fast, responsive workflow execution.
- **Structured outputs** keep the brief constrained to typed artifacts and validated JSON.
- **Bounded orchestration** makes each stage inspectable instead of opaque.
- **Enterprise reliability** is prioritized over open-ended chat or fake autonomous behavior.

The architecture can support **Gemini Pro** for deeper final synthesis later without changing the current one-URL flow.

## Why this is executive-grade

- one URL input
- visible bounded Gemini workflow
- evidence receipts
- machine-facing GTM risk layer
- inferred competitive context with confidence language
- Fix Pack with handoff-ready workstreams
- before/after AI perception simulator
- clear limitations and no ranking guarantees

## Why this fits the challenge

### Application of Technology

Gemini powers the bounded six-stage agent workflow, structured JSON synthesis, visible intermediate artifacts, Machine-Facing GTM Risks, Fix Pack generation, and Before / After AI Perception Simulator.

### Presentation

One URL input, visible workflow trace, boardroom-ready brief, executive snapshot, and handoff-ready workstreams make the product legible in under a minute.

### Business Value

Enterprises risk being misunderstood, skipped, weakly cited, or misrouted by AI agents and answer engines before human buyers ever reach the website.

### Originality

Most SEO tools optimize for search crawlers. This product audits and repairs how AI agents, LLMs, and answer engines understand, cite, route, or skip a company.

## What the brief includes

- Executive Verdict
- Boardroom Snapshot
- score cards
- Decision Memo
- top machine-facing gap
- Machine-Facing GTM Risks
- Inferred Competitive Context
- Fix Pack
- Before / After AI Perception Simulator
- visible agent artifacts
- human vs agent, AIO, and citation details
- journey diagram
- evidence receipts
- Gemini Orchestration Summary
- Why Gemini
- Why this fits the challenge
- limitations / confidence note

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
