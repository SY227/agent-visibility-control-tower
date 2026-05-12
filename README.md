# Agent Visibility Control Tower

Agent Visibility Control Tower is a Gemini-powered executive workbench for the agent-mediated web. It helps enterprises inspect and repair the machine-facing GTM layer: what AI agents, LLMs, and answer engines understand, cite, route, or skip before a human buyer ever clicks.

Built for the **Transforming Enterprise Through AI hackathon**, **Track 2: AI Agents with Google AI Studio**.

## Live links

- Live demo: https://agent-visibility-control-tower-live.vercel.app/
- Source code: https://github.com/SY227/agent-visibility-control-tower

## Submission assets

- Pitch deck: https://drive.google.com/file/d/1B0QCFywsoiDxFpTEAgMSdzQbUyO3yrdS/view?usp=sharing
- Demo video: https://drive.google.com/file/d/1mPhrsGzXENZs-A1i3N5dHRyP7QpWASsd/view?usp=sharing

The pitch deck and demo video are also included in the official hackathon submission package.

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
- **Directional Competitive Context**
- a **Fix Pack** with handoff-ready workstreams
- a **Before / After AI Perception Simulator**
- **Evidence Receipts**
- visible agent artifacts from each stage in the workflow

## How it works

1. **Website Context Agent** captures public site facts and page signals.
2. **LLM Perception Agent** models likely machine interpretation.
3. **Agent Visitor Agent** checks buyer-path and next-action clarity.
4. **AIO / Answer Engine Agent** evaluates answer-surface readiness.
5. **Citation Readiness Agent** reviews proof and trust packaging.
6. **Fix Prioritization Agent** turns findings into ranked actions and a Fix Pack.

## Why this is executive-grade

- one URL input
- evidence receipts
- machine-facing GTM risk layer
- directional competitive context with confidence language, not verified competitor claims
- Fix Pack with handoff-ready workstreams
- before/after AI perception simulator
- clear limitations and no ranking guarantees

## What the brief includes

- Executive Verdict
- Boardroom Snapshot
- score cards
- Decision Memo
- top machine-facing gap
- Machine-Facing GTM Risks
- Directional Competitive Context
- Fix Pack
- Before / After AI Perception Simulator
- visible agent artifacts
- evidence receipts

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

## Deployment

This app is deployed on Vercel. Set `GEMINI_API_KEY` and optionally `GEMINI_MODEL` in the Vercel project environment variables before deploying.

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
