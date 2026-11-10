-- Enable pgvector
create extension if not exists vector;

-- Conversations
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_session_id text not null,
  title text,
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

-- Pinned context (user's permanent context)
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
  last_result_hash text,
  created_at timestamptz default now()
);

-- Indexes
create index messages_conversation_id_idx on messages(conversation_id);
create index messages_user_session_idx on messages(user_session_id);
create index messages_created_at_idx on messages(created_at);
create index messages_embedding_idx on messages using ivfflat (embedding vector_cosine_ops) with (lists = 100);
