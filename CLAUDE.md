# CLAUDE.md — Meowmory

> This file is the single source of truth for building Meowmory.
> Read this fully before writing any code. Every decision here was made deliberately.

---

## What We're Building

**Meowmory** — AI that hunts down what changed.

A persistent AI research assistant that remembers everything you've asked, searches the live web, and tells you exactly what changed since you last asked about something. It's a real side project and also a submission for the minimi hiring challenge.

**Core value prop in one sentence:**
You ask once, Meowmory remembers forever, and tells you when the answer changes.

**The three questions this must answer perfectly:**
1. "On Monday we shortlisted 5 CRM tools. Has any of them changed pricing since?"
2. "What did I ask you on 3 November? Is your answer still correct today?"
3. "Last Tuesday I asked about Postgres hosting. Has any pricing changed since then?"

---

## Tech Stack — Final Decisions

| Layer | Tool | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack, Edge-ready, Vercel-native |
| Language | TypeScript, strict mode | Required by challenge + correctness |
| Styling | Tailwind CSS v3 | Utility-first, no extra CSS files |
| Database | Supabase (Postgres + pgvector) | Free tier, vector search + relational in one |
| Search | Tavily API | Built for AI agents, returns clean content |
| Auth | None (BYOK model — user brings their own API key) | Zero infra cost |
| AI/LLM | User's own Anthropic or OpenAI key (via BYOK) | Free for us |
| Embeddings | Same user key — `text-embedding-3-small` or `claude-3-haiku` | For semantic memory search |
| Deployment | Vercel (free tier) | Zero config |
| Local dev search | Tavily free tier (1000/mo) | Fine for dev |

**Cost to run: $0.** Users bring their own API keys. The only thing we pay for is Supabase free tier (500MB) and Vercel free tier.

**For developer's own testing:** Keys go in `.env.local`. Never committed. `.env.example` lists all keys without values.

---

## Architecture — The Full Pipeline

Every user message goes through this 6-stage pipeline. Never shortcut it.

```
User Message
    │
    ▼
[1. QUERY CLASSIFIER]
    Classify into: new_query | recall_query | staleness_check | multi_entity
    - new_query: "What are the best Postgres hosting options?"
    - recall_query: "What did I ask on Nov 3?" / "What were those CRM tools I found?"
    - staleness_check: "Has anything changed since I asked about Postgres hosting?"
    - multi_entity: "On Monday we shortlisted 5 CRM tools — has any changed?"
    │
    ▼
[2. MEMORY RETRIEVAL]
    - For recall_query: exact date + semantic search over past turns
    - For staleness_check: find the original query + its stored answer
    - For multi_entity: find the original entities list from memory
    - For new_query: find related past queries (for context enrichment)
    Uses: Supabase pgvector for semantic + SQL for exact date/keyword
    │
    ▼
[3. QUERY PLANNER]
    - new_query → 1-3 search queries
    - multi_entity → decompose into N parallel searches (one per entity)
    - staleness_check → re-run original search + add "pricing 2024/2025" freshness boost
    - recall_query that needs freshness → plan re-search
    │
    ▼
[4. WEB SEARCH] (Tavily)
    - Run all planned searches in parallel (Promise.all)
    - Each result stores: url, title, content, published_date, search_timestamp
    - For multi_entity: tag each result with which entity it belongs to
    │
    ▼
[5. CHANGE DETECTOR] (only for staleness_check and multi_entity re-checks)
    - Pull stored past_results from memory for the same topic
    - Ask LLM: "Here is what we found before. Here is what we found now. What changed?"
    - Return structured diff: {changed: [], new: [], removed: [], unchanged: []}
    │
    ▼
[6. SYNTHESIS]
    - Combine: memory context + fresh search results + change diff
    - Generate streaming response
    - Cite sources inline
    - If staleness_check: lead with the diff, then full context
    │
    ▼
[7. MEMORY WRITER]
    - Store: message, response, timestamp, query_type, entities[], search_queries[], 
      search_results[], embeddings
    - This always runs, even on errors (store what we know)
    │
    ▼
Streamed Response → UI
```

---

## Database Schema (Supabase)

Run these migrations in order. Never modify a migration — add a new one.

```sql
-- Enable pgvector
create extension if not exists vector;

-- Conversations
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_session_id text not null,  -- fingerprint from browser, no auth needed
  title text,                      -- auto-generated from first message
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages (each turn in a conversation)
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  user_session_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now(),
  
  -- Classification metadata
  query_type text,  -- new_query | recall_query | staleness_check | multi_entity
  entities text[],  -- extracted named entities: ["Notion", "Linear", "Jira"]
  
  -- Search metadata  
  search_queries text[],
  search_results jsonb,  -- full Tavily response, stored for change detection later
  
  -- Embeddings for semantic search
  embedding vector(1536),  -- openai text-embedding-3-small dimensions
  
  -- Change detection
  change_diff jsonb  -- {changed: [], new: [], removed: []} if staleness_check
);

-- Pinned context (user's permanent context, e.g. "I'm a frontend dev at a fintech startup")
create table pinned_context (
  id uuid primary key default gen_random_uuid(),
  user_session_id text not null unique,
  context text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Watched topics (for future "notify me if X changes" feature)
create table watched_topics (
  id uuid primary key default gen_random_uuid(),
  user_session_id text not null,
  topic text not null,
  original_message_id uuid references messages(id),
  last_checked_at timestamptz default now(),
  last_result_hash text,  -- hash of last search result to detect changes
  created_at timestamptz default now()
);

-- Indexes
create index messages_conversation_id_idx on messages(conversation_id);
create index messages_user_session_idx on messages(user_session_id);
create index messages_created_at_idx on messages(created_at);
create index messages_embedding_idx on messages using ivfflat (embedding vector_cosine_ops) with (lists = 100);
```

---

## File Structure

```
meowmory/
├── CLAUDE.md                    ← this file
├── DESIGN.md                    ← challenge submission design doc
├── README.md
├── .env.example                 ← all keys listed, no values
├── .env.local                   ← never committed (developer's own keys)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
│
├── app/
│   ├── layout.tsx               ← root layout, fonts, global styles
│   ├── page.tsx                 ← landing page / home
│   ├── chat/
│   │   ├── page.tsx             ← main chat interface
│   │   └── [id]/page.tsx        ← specific conversation
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts         ← main chat endpoint (streaming)
│   │   ├── conversations/
│   │   │   └── route.ts         ← list / create conversations
│   │   ├── memory/
│   │   │   └── search/route.ts  ← semantic search over past messages
│   │   └── health/route.ts      ← simple health check
│   └── globals.css
│
├── lib/
│   ├── pipeline/
│   │   ├── classifier.ts        ← query type classifier
│   │   ├── memory-retrieval.ts  ← fetch relevant past messages
│   │   ├── query-planner.ts     ← decompose into search tasks
│   │   ├── search.ts            ← Tavily wrapper (parallel search)
│   │   ├── change-detector.ts   ← diff past vs. current results
│   │   └── synthesizer.ts       ← final LLM call + streaming
│   │
│   ├── memory/
│   │   ├── writer.ts            ← save message + embedding to Supabase
│   │   ├── reader.ts            ← query Supabase (exact + semantic)
│   │   └── embeddings.ts        ← generate embeddings via user's key
│   │
│   ├── providers/
│   │   ├── anthropic.ts         ← Anthropic SDK wrapper (uses user key)
│   │   ├── openai.ts            ← OpenAI SDK wrapper (uses user key)
│   │   └── llm.ts               ← unified LLM interface (abstracts provider)
│   │
│   ├── supabase/
│   │   ├── client.ts            ← server-side Supabase client
│   │   └── types.ts             ← generated types from schema
│   │
│   └── utils/
│       ├── session.ts           ← browser fingerprint for anonymous sessions
│       ├── date-parser.ts       ← parse "last Tuesday", "3 November", "Monday"
│       └── hash.ts              ← hash search results for change detection
│
├── components/
│   ├── chat/
│   │   ├── ChatWindow.tsx       ← main chat container
│   │   ├── MessageList.tsx      ← scrollable message thread
│   │   ├── Message.tsx          ← single message bubble
│   │   ├── MessageInput.tsx     ← textarea + send button
│   │   ├── ChangeDiff.tsx       ← visual diff card (what changed)
│   │   └── Sources.tsx          ← inline source citations
│   ├── sidebar/
│   │   ├── Sidebar.tsx          ← conversation list + controls
│   │   ├── ConversationItem.tsx
│   │   └── ChangeFeed.tsx       ← "things that changed" running log
│   ├── settings/
│   │   ├── SettingsModal.tsx    ← API key input, model selection
│   │   ├── ApiKeyInput.tsx      ← key input with show/hide toggle
│   │   └── PinnedContext.tsx    ← user's permanent context editor
│   └── ui/
│       ├── CatLoader.tsx        ← cat walking animation for search state
│       ├── Button.tsx
│       ├── Modal.tsx
│       └── Toast.tsx
│
├── hooks/
│   ├── useChat.ts               ← chat state + streaming
│   ├── useSettings.ts           ← API key + model from localStorage
│   ├── useSession.ts            ← anonymous session management
│   └── useConversations.ts      ← conversation list + CRUD
│
└── public/
    ├── cat-logo.svg             ← abstract cat glyph (not cartoonish)
    └── og-image.png
```

---

## API Design

### POST /api/chat (streaming)

**Request:**
```typescript
{
  message: string;
  conversationId: string | null;  // null = start new conversation
  apiKey: string;                  // user's key, sent from client
  provider: "anthropic" | "openai";
  model: string;                   // "claude-sonnet-4-6" | "gpt-4o" | "gpt-4o-mini"
  sessionId: string;               // browser fingerprint
}
```

**Response:** Server-Sent Events stream
```
data: {"type": "status", "content": "sniffing around..."}
data: {"type": "status", "content": "found 3 sources"}
data: {"type": "status", "content": "checking what changed..."}
data: {"type": "delta", "content": "Based on what "}
data: {"type": "delta", "content": "I found last week..."}
data: {"type": "sources", "content": [...]}
data: {"type": "diff", "content": {"changed": [...], "new": [...], "removed": [...]}}
data: {"type": "done", "conversationId": "uuid"}
```

**Headers required from client:**
- `x-api-key`: user's API key
- `x-provider`: "anthropic" | "openai"
- `x-model`: model string

### GET /api/conversations

Returns list of conversations for the session, most recent first.

### GET /api/memory/search?q=...&limit=5

Semantic search over past messages for the session.

---

## BYOK (Bring Your Own Key) System

**How it works:**
1. On first visit, user sees a settings prompt to add their API key
2. Key stored in `localStorage` under `meowmory_api_key` and `meowmory_provider`
3. Key is sent with every request as an HTTP header
4. Server reads the key from the header, **never stores it**
5. If key is missing, all API routes return `401` with a message: "Add your API key in settings"

**Key handling rules (never break these):**
- Never log the API key
- Never store in DB, never store in cookies
- Validate the key on first use with a cheap test call
- Show the last 4 characters only: `sk-...4a3f`
- Clear from localStorage on explicit "Remove key" action

**Model options to show in settings:**
```typescript
const MODELS = {
  anthropic: [
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", recommended: true },
    { id: "claude-haiku-3-5", label: "Claude Haiku 3.5 (faster)" },
  ],
  openai: [
    { id: "gpt-4o", label: "GPT-4o", recommended: true },
    { id: "gpt-4o-mini", label: "GPT-4o Mini (faster)" },
  ]
}
```

---

## UI / Design System

### Philosophy
Minimal. Intentional. Cat details are texture, not theme-park.
One thing should feel memorable — the change diff visualization.
Everything else is quiet.

### Color Palette
```css
:root {
  --bg:          #F7F7F5;   /* off-white, not pure white */
  --bg-subtle:   #EFEDE9;   /* sidebar, secondary surfaces */
  --surface:     #FFFFFF;
  --border:      #E4E2DD;
  --text:        #1A1A18;   /* near-black, slightly warm */
  --text-muted:  #8A8880;
  --accent:      #2D6A4F;   /* deep forest green — the "changed" color */
  --accent-warm: #C4622D;   /* warm amber — warnings, stale indicators */
  --removed:     #9B1D1D;   /* dark red — things removed/gone */
}
```

No gradients. No blur effects. No glassmorphism. Flat surfaces with clean borders.

### Typography
- Font: **Geist** (Vercel's font, free, clean, technical but warm)
- Body: 15px / 1.6 line-height
- Code/entities: `font-mono` Geist Mono
- No tracking on regular text. Slight tracking (-0.01em) on headings only.

### Cat Details (texture, not decoration)
- Logo: Abstract cat silhouette — a simple glyph, like a punctuation mark that happens to look like a cat
- Loading state: "sniffing around..." / "found something..." / "comparing notes..." (never "loading..." or "thinking...")
- CatLoader component: 3-frame CSS animation of small paw prints appearing, nothing cartoonish
- Empty state illustration: minimal line cat sitting, waiting
- Favicon: cat emoji 🐾 or small paw SVG
- Error state: "something spooked the cat. try again."

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  🐾 Meowmory              [Settings]  [New Chat]         │  ← 56px header
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  Sidebar     │  Chat Window                             │
│  240px       │  flex-1                                  │
│              │                                          │
│  - Today     │  [message thread]                        │
│  - Yesterday │                                          │
│  - Older     │                                          │
│              │                                          │
│  ──────────  │  ────────────────────────────────────    │
│  Change Feed │  [textarea input]  [send]                │  ← 80px input area
└──────────────┴──────────────────────────────────────────┘
```

On mobile: sidebar collapses to a drawer, header shows hamburger.

### Message Design
- User messages: right-aligned, `--bg-subtle` background, no border
- Assistant messages: left-aligned, white card with `--border` border
- Sources: collapsed by default, expand on click with a small "X sources" badge
- Change diff: its own distinct card below the message, green/red/amber per change type

### Change Diff Card Design
```
┌─── What changed since Nov 3 ──────────────────┐
│  ✦ CHANGED    Linear raised Pro from $8 → $10  │  ← accent green
│  + NEW        Jira shipped AI features (Nov 8)  │  ← new entry green
│  - REMOVED    Basecamp dropped free tier        │  ← red
│  · SAME       Notion pricing unchanged          │  ← muted
└────────────────────────────────────────────────┘
```

---

## The Classifier (most important piece of logic)

```typescript
type QueryType = 
  | 'new_query'       // fresh question, no memory needed
  | 'recall_query'    // "what did I ask...", "remind me of..."
  | 'staleness_check' // "has X changed since...", "is that still true?"
  | 'multi_entity';   // "those 5 tools I found", "the options from Monday"

// Classifier prompt (sent to LLM)
const CLASSIFIER_SYSTEM = `
You are a query classifier for a research assistant with memory.
Classify the user's message into exactly one of these types:

- new_query: A fresh question with no reference to past conversations
- recall_query: User wants to retrieve something they asked before
- staleness_check: User wants to know if past information is still current
- multi_entity: User refers to a list of things from a past message

Also extract: 
- entities: named companies, products, tools mentioned (array of strings)
- time_reference: any date/time reference ("last Tuesday", "November 3", "Monday")
- original_topic: the core topic they're asking about (for memory search)

Return JSON only. No explanation.
`;
```

---

## Date Parsing (critical for recall)

The `date-parser.ts` utility must handle:
- "last Tuesday" → specific date
- "3 November" / "November 3" → date in current or past year
- "Monday" → most recent Monday
- "yesterday" / "last week" / "this morning" → relative dates
- ISO dates → passthrough

Use `date-fns` for all date math. Never use `moment`.

```typescript
// Always store created_at as UTC in DB
// Always convert relative references relative to user's local time
// Pass user timezone from client: Intl.DateTimeFormat().resolvedOptions().timeZone
```

---

## Memory Search Strategy

Two search modes, always run both and merge results:

**1. Exact / SQL search** (for recall_query with time reference):
```sql
select * from messages 
where user_session_id = $1
  and created_at >= $2  -- parsed date range start
  and created_at < $3   -- parsed date range end
  and role = 'user'
order by created_at desc
limit 10;
```

**2. Semantic search** (for topic-based recall):
```sql
select *, 1 - (embedding <=> $1) as similarity
from messages
where user_session_id = $2
  and role = 'user'
order by embedding <=> $1
limit 5;
```

Merge by deduplicating on message ID, sort by relevance score.

---

## Tavily Search Integration

```typescript
// Always use this configuration
const searchConfig = {
  search_depth: "advanced",    // not "basic" — we want full content
  max_results: 5,
  include_answer: true,        // Tavily's own summary
  include_raw_content: false,  // too much noise
  include_images: false,
  include_published_date: true // critical for change detection
};

// For staleness_check: add time filter
const freshnessConfig = {
  ...searchConfig,
  days: 7  // only results from last 7 days
};
```

**Parallel search for multi_entity:**
```typescript
const results = await Promise.all(
  entities.map(entity => tavily.search(`${entity} pricing features 2025`))
);
```

---

## Streaming Implementation

Use Next.js Route Handlers with `ReadableStream` for streaming:

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send({ type: 'status', content: 'sniffing around...' });
        // ... pipeline stages ...
        send({ type: 'done', conversationId });
      } catch (e) {
        send({ type: 'error', content: 'something spooked the cat. try again.' });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

**On the client**, use `useChat.ts` hook that reads SSE and updates state incrementally. Never use `fetch` directly in components.

---

## Session Management (no auth)

```typescript
// lib/utils/session.ts
// Generate a stable browser fingerprint
// Store in localStorage as meowmory_session_id
// Generate once, persist indefinitely
// Format: session_<16 random hex chars>

export function getOrCreateSessionId(): string {
  const key = 'meowmory_session_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = `session_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  localStorage.setItem(key, id);
  return id;
}
```

No login, no signup, no email. All data is scoped to the session ID. Data persists across browser sessions via Supabase.

---

## Environment Variables

```bash
# .env.example — commit this
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TAVILY_API_KEY=

# DO NOT add ANTHROPIC_API_KEY or OPENAI_API_KEY here
# Those come from the user via request headers (BYOK)
# For developer testing only: add to .env.local, never .env.example
```

---

## Coding Rules — Never Break These

1. **TypeScript strict mode.** No `any`. No `as unknown as X`. Use proper types.
2. **Never store API keys server-side.** Read from request header only. Never log.
3. **Never commit `.env.local`.** It's in `.gitignore` already, keep it there.
4. **All DB queries go through `lib/supabase/`.** No raw Supabase calls in components or API routes.
5. **All LLM calls go through `lib/providers/llm.ts`.** Never instantiate Anthropic/OpenAI SDK outside this file.
6. **All search calls go through `lib/pipeline/search.ts`.** Never call Tavily directly.
7. **Components are dumb.** No fetch calls in components. All data fetching in hooks or server components.
8. **Errors are user-facing.** Every catch block must produce a human-readable message. No "Error: undefined".
9. **Streaming always.** Never wait for a full LLM response before showing anything. Always stream.
10. **Mobile-first.** Every component must work at 375px width before scaling up.

---

## What Makes This Stand Out (for the challenge and as a project)

Do not skip these — they are the differentiators:

1. **Change Detector** — explicit diff of past vs. current results, not just re-answering
2. **Query Classifier** — 4-type classification before every search
3. **Parallel search for multi_entity** — decompose "5 CRM tools" into 5 parallel searches
4. **Semantic + exact memory** — both pgvector AND SQL date queries
5. **Pinned context** — user sets permanent context, never re-explains themselves
6. **Change Feed sidebar** — visual running log of things that changed
7. **BYOK** — no signup, no payment, works immediately
8. **Status streaming** — user sees what the agent is doing in real-time
9. **DESIGN.md** — written like a senior engineer: decisions + rejections + next steps

---

## Features — Build in This Order

### Phase 1 — Core (must work for submission)
- [ ] Supabase schema + migrations
- [ ] Session management (fingerprint)
- [ ] Settings modal (BYOK — API key + model selection)
- [ ] Pinned context
- [ ] Query classifier
- [ ] Memory writer + reader
- [ ] Tavily search wrapper
- [ ] Basic synthesis (new_query flow only)
- [ ] Streaming chat UI
- [ ] Conversation persistence + sidebar

### Phase 2 — Differentiators (what wins the challenge)
- [ ] recall_query flow (date parsing + memory retrieval)
- [ ] staleness_check flow (re-search + change detection)
- [ ] multi_entity flow (decompose + parallel search)
- [ ] Change Diff card UI
- [ ] Semantic memory search (embeddings)

### Phase 3 — Side Project Polish
- [ ] Change Feed sidebar
- [ ] Topic Watch (re-check watched topics on visit)
- [ ] Export memory as JSON / Markdown
- [ ] Shareable conversation links
- [ ] Mobile layout
- [ ] PWA manifest + offline indicator
- [ ] Landing page

---

## DESIGN.md Requirements (challenge submission)

This file must exist in the repo root and cover:
- How it works (the 6-stage pipeline in plain English)
- Why each major decision was made (not what — why)
- What was considered and rejected (e.g., "considered vector-only memory, rejected because exact date recall requires structured queries; considered localStorage-only, rejected because cross-device access matters")
- What we'd do with another week (topic monitoring, multi-user, proactive re-checks, Chrome extension to capture context automatically)

Write it like a senior engineer's RFC, not a README.

---

## Commands

```bash
# Install
npm install

# Dev server
npm run dev

# Generate Supabase types (run after schema changes)
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts

# Type check
npx tsc --noEmit

# Build
npm run build
```

---

## What Not to Build

- No user authentication / login (session-based only)
- No payment / subscription logic (BYOK = free for us)
- No image generation or file upload
- No multi-modal inputs in Phase 1/2
- No real-time collaboration
- No mobile app (PWA is enough)
- No dark mode in Phase 1 (add in Phase 3 if time permits)

---

## Deployment Checklist (Vercel)

1. Push to GitHub (public repo for challenge submission)
2. Connect to Vercel, set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TAVILY_API_KEY`
3. Enable Supabase pgvector extension in dashboard
4. Run migrations via Supabase SQL editor
5. Set `NEXT_PUBLIC_APP_URL` to production URL
6. Verify `.env.example` has all keys listed (without values)
7. Verify `DESIGN.md` is in repo root

---

*Last updated: November 2026*
*This file is the contract. When in doubt, refer back here.*
