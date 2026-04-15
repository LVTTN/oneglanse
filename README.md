# OneGlanse

**The open-source GEO tracker. Free to run. Fully self-hosted. Your data never leaves your machine.**

OneGlanse monitors how your brand appears inside real AI products — ChatGPT, Gemini, Perplexity, Claude, and Google AI Overview. It is open source, MIT licensed, and costs nothing to run on your own machine or VPS.

**It doesn't call the model API.** It opens the actual ChatGPT, Gemini, Perplexity, Claude, and AI Overview interfaces in a real browser — the same way a user would — and captures exactly what gets rendered: the full response, inline citations, recommended sources, and how your brand is positioned relative to competitors. API responses omit all of this. OneGlanse captures what users actually see.

**Your data stays on your machine.** Responses, analytics, and auth sessions are stored in a PostgreSQL and ClickHouse instance you own and control. Nothing is sent to any external server. Response analysis calls go directly from your infrastructure to OpenAI or Anthropic using your own API key.

**You use your own provider accounts.** OneGlanse authenticates to ChatGPT, Gemini, Perplexity, Claude, and Google using your own existing logins. No shared credentials. No scraped accounts. Your sessions, stored locally.

**One command to start:**

```bash
git clone https://github.com/aryamantodkar/oneglanse
cd oneglanse
pnpm install
pnpm local
```

Opens at [http://localhost:3000](http://localhost:3000). Everything is handled on first run: creates `.env`, starts Postgres / ClickHouse / Redis via Docker, runs migrations, and bootstraps the browser runtime. Go to `/providers` to connect your AI accounts.

[App](https://app.oneglanse.com) · [Docs](https://docs.oneglanse.com) · [oneglanse.com](https://oneglanse.com)

---

<img width="100%" alt="OneGlanse Dashboard" src="https://github.com/user-attachments/assets/d5438aff-67bc-4556-baa8-939906a59c02" />

**Your overall GEO score, top competitor, rank position, and most-cited sources — in one view.** The dashboard shows your visibility score across all AI models, which competitor co-appears most often alongside your brand, your average rank position across all prompts, and which domains the AI products cite when your category comes up.

---

<img width="100%" alt="OneGlanse Prompt Responses" src="https://github.com/user-attachments/assets/09fae3f5-4e3c-4920-9d19-c32d9a1da0d5" />

**The actual AI response, scored.** Every captured response is tagged with a GEO score, sentiment score, visibility percentage, and rank position. The perception panel on the right extracts how the model is framing your brand: what it says your pricing signal is, what you're best known for, and what specific claims it repeats most often about you.

---

<img width="100%" alt="OneGlanse Source Intelligence" src="https://github.com/user-attachments/assets/caace32a-1e68-44e8-9b71-f582e9dc9de0" />

**Which sources drive your AI presence — and how you compare.** The left panel shows every article and domain being cited about your brand, with the exact article title so you know why that domain ranks. The competitor chart on the right tracks your position against rivals across three dimensions: Presence (are you mentioned), Recommendation (are you recommended), and Sentiment (how positively you're framed).

---

<img width="100%" alt="OneGlanse Analytics" src="https://github.com/user-attachments/assets/aac7d04b-e7b9-4e58-b780-2afd33b6c960" />

**Per-prompt breakdown, not aggregated averages.** Every prompt you track gets its own row: GEO score, sentiment, visibility percentage, and rank position. You can see exactly which queries you own and which ones you're losing — and track how both change over time.

---

## Features

- **5 providers** — ChatGPT, Gemini, Perplexity, Claude, Google AI Overview
- **UI-first capture** — browser automation against real product interfaces, not the API. What users see is what you get.
- **GEO scoring** — visibility, sentiment, rank position, and recommendation type, tracked per prompt over time
- **Competitor co-mentions** — see which brands appear alongside yours and how they're framed
- **Citation tracking** — which domains and articles AI products are citing for your category
- **AI perception analysis** — how models characterize your pricing, key claims, and brand positioning
- **Your own LLM key** — response analysis uses your OpenAI or Anthropic key, called directly from your infrastructure
- **ClickHouse analytics** — high-volume time-series storage built for prompt tracking at scale
- **Self-hosted, free forever** — full stack deploys to any VPS with a single command

---

## Self-Hosting

For VPS deployment, recurring scheduling, provider auth transfer, and all configuration options → **[docs.oneglanse.com](https://docs.oneglanse.com)**

---

## Stack

| Layer | Technology |
|---|---|
| Web app | Next.js 15, React 19, tRPC, Drizzle ORM |
| Browser worker | Camoufox, Playwright, BullMQ |
| Analytics DB | ClickHouse |
| Relational DB | PostgreSQL 16 |
| Queue | Redis |
| Auth | Better Auth |
| Response analysis | OpenAI or Anthropic (your key) |

---

## Acknowledgements

| Project | Use | License |
|---|---|---|
| [Camoufox](https://github.com/daijro/camoufox) | Anti-fingerprint Firefox-based browser used for all provider sessions | MPL-2.0 |
| [Playwright](https://github.com/microsoft/playwright) | Browser automation and page control | Apache-2.0 |
| [BullMQ](https://github.com/taskforcesh/bullmq) | Redis-backed job queue for provider workers | MIT |
| [ClickHouse](https://github.com/ClickHouse/ClickHouse) | Analytics and time-series storage | Apache-2.0 |
| [Drizzle ORM](https://github.com/drizzle-team/drizzle-orm) | TypeScript ORM | Apache-2.0 |
| [Better Auth](https://github.com/better-auth/better-auth) | Authentication framework | MIT |
| [Turndown](https://github.com/mixmark-io/turndown) | HTML to Markdown conversion | MIT |

---

## License

MIT
