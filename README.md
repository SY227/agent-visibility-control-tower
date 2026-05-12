# Agent Visibility Control Tower

Agent Visibility Control Tower is a Gemini-powered executive workbench that helps companies see and improve how AI agents, LLMs, and answer engines understand their website before a human buyer ever clicks.

It helps enterprises inspect how AI agents, LLMs, and answer engines understand, describe, cite, route, or skip a company — then turns those findings into an executive-ready Fix Pack.

Built for the **Transforming Enterprise Through AI hackathon**, **Track 2: AI Agents with Google AI Studio**.

## Live links

- Live demo: https://agent-visibility-control-tower-live.vercel.app/
- Source code: https://github.com/SY227/agent-visibility-control-tower

## Submission assets

- Pitch deck: https://drive.google.com/file/d/1B0QCFywsoiDxFpTEAgMSdzQbUyO3yrdS/view?usp=sharing
- Demo video: https://drive.google.com/file/d/1mPhrsGzXENZs-A1i3N5dHRyP7QpWASsd/view?usp=sharing

The pitch deck and demo video are also included in the official hackathon submission package.

## Core product

**One URL in → AI Visibility Brief + visible agent artifacts + Fix Pack + Before / After AI Perception Simulator out.**

The app keeps the workflow simple: one company URL, no login, no documents, and no setup tax.

It runs a bounded public-page scan, then uses a six-stage Gemini workflow to inspect how the company may be understood by AI agents, LLMs, and answer engines.

## What problem this solves

The next visitor to a company website may not be human.

AI agents, LLMs, and answer engines may read the site first. They may summarize the company, decide whether its claims are trustworthy, and route a buyer toward or away from it.

That creates a new machine-facing GTM risk.

A company may be:

- described too broadly
- weakly cited
- routed to the wrong buyer path
- skipped by an AI agent
- flattened into a generic category
- misunderstood before a human buyer ever clicks

Agent Visibility Control Tower helps teams inspect that machine-facing layer and repair it with clear, practical outputs.

## Not a generic SEO audit

This is not a generic SEO audit, crawler audit, or open-ended chatbot.

It is machine-facing GTM infrastructure for the AI-mediated web.

The goal is not only to help humans read a website. The goal is to help AI agents, LLMs, and answer engines understand what the company does, trust its proof, cite the right signals, and guide buyers to the right next step.

## Executive use case

- **For GTM and growth teams:** see where AI agents may misunderstand or misroute the company.
- **For digital teams:** improve answer-engine readiness, page clarity, and proof packaging.
- **For content teams:** generate AI-readable copy, FAQ blocks, and citation-ready proof language.
- **For engineering teams:** identify schema and machine-readable structure workstreams.
- **For executives:** see the risk, business impact, owner, and first-week move.

## Product flow

Paste one company website URL.

The app reads a bounded set of public pages, then returns:

- an **AI Visibility Readiness Brief**
- an **Executive Verdict**
- a **Boardroom Snapshot**
- a **Decision Memo**
- **Machine-Facing GTM Risks**
- **Directional Competitive Context**
- a prioritized **Fix Pack**
- a **Before / After AI Perception Simulator**
- **Evidence Receipts**
- visible agent artifacts from each stage of the workflow

## How it works

The app uses a six-stage Gemini workflow:

1. **Website Context Agent** captures public site facts, page signals, and missing basics.
2. **LLM Perception Agent** models how LLMs may summarize and describe the company.
3. **Agent Visitor Agent** checks whether an AI agent can follow the buyer path.
4. **AIO / Answer Engine Agent** evaluates answer-engine readiness and reusable page structure.
5. **Citation Readiness Agent** reviews whether claims, proof, and trust signals are easy to cite.
6. **Fix Prioritization Agent** turns the findings into ranked actions and a Fix Pack.

## Why this is executive-ready

- one URL input
- bounded public-page scan
- visible Gemini workflow trace
- evidence receipts
- machine-facing GTM risk layer
- directional competitive context with confidence language
- Fix Pack with handoff-ready workstreams
- Before / After AI Perception Simulator
- clear limitations and no ranking guarantees

## What the brief includes

- Executive Verdict
- Boardroom Snapshot
- Decision Memo
- AI Visibility Score
- Citation Readiness Score
- Agent Actionability Score
- top machine-facing gap
- Machine-Facing GTM Risks
- Directional Competitive Context
- Fix Pack
- Before / After AI Perception Simulator
- Evidence Receipts
- visible agent artifacts

## Example demo path

For the clearest demo experience, open the live app and click the **Shopify** sample case.

The Shopify demo shows:

- one URL input
- a visible six-stage Gemini workflow
- AI Visibility Score
- Executive Verdict
- Boardroom Snapshot
- Fix Pack
- Evidence Receipts
- visible agent artifacts

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

This app is deployed on Vercel.

Set `GEMINI_API_KEY` and optionally `GEMINI_MODEL` in the Vercel project environment variables before deploying.

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

## License

MIT License
